import api from "../../helpers/apiConfiguration";
import {
  createDataKey,
  deriveKeys,
  deriveRecoveryKeys,
  generateRecoveryKey,
  generateSalt,
  KDF_ITERATIONS,
  parseRecoveryKey,
  rewrapDataKey,
  unwrapDataKey,
} from "services/encryptor";
import { clearKey, saveKey } from "services/keyStore";
import {
  addLocalUser,
  deleteLocalUser,
  getLocalUser,
  updateLocalUser,
} from "services/localUsers";
import { requestPersistentStorage } from "services/persistentStorage";
import { TAppDispatch, TAppThunk } from "store/store";
import {
  AUTH_ERROR,
  AUTH_FETCHING,
  SET_ISDEMO,
  SET_LOCAL_USER,
  SET_RECOVERY_REMINDER,
  SET_TOKEN,
  SET_USER,
  SHOW_RECOVERY_KEY,
} from "./auth.slice";
import {
  IAuthResponse,
  IChangePassword,
  ICredentials,
  IKeyMaterial,
  ILocalCredentials,
  IPrelogin,
  IRecover,
  IRecoveryStatus,
  IUser,
} from "./auth.types";
import { CLEAR_USERDATA } from "store/userdata/userdata.slice";
import { clearDemoData } from "helpers/demoHelper";

// the server's error codes, from a rejected request's response
const errorCodes = (err: unknown) =>
  (err as { data?: { errors?: string[] } } | undefined)?.data?.errors;

const authError = (err: unknown) =>
  AUTH_ERROR(errorCodes(err)?.join(", ") ?? null);

// a failure of our own, read like the server's
const codeError = (code: string) => ({ data: { errors: [code] } });

// crypto failures have no server error code
const loginError = (err: unknown, failedCode = "failedLogin") => {
  const errors = errorCodes(err);
  if (!errors) {
    console.error(err);
  }
  return AUTH_ERROR(errors?.join(", ") ?? failedCode);
};

// Starting a session of one kind ends the others (server, on-device, demo).
const endSessions = async (dispatch: TAppDispatch) => {
  dispatch(CLEAR_USERDATA());
  clearDemoData();
  dispatch(SET_ISDEMO(false));
  dispatch(SET_TOKEN(null));
  dispatch(SET_LOCAL_USER(null));
  dispatch(SHOW_RECOVERY_KEY(null));
  dispatch(SET_RECOVERY_REMINDER(false));
  dispatch(AUTH_FETCHING());
  await clearKey();
};

// Shared by login and register: resolves to the token once the data key is stored.
// Userdata is loaded by App once the user is set.
const authenticate = async (
  dispatch: TAppDispatch,
  getToken: () => Promise<string>,
  failedCode?: string
) => {
  await endSessions(dispatch);

  try {
    const token = await getToken();
    dispatch(attempt(token));
  } catch (err) {
    await clearKey();
    dispatch(SHOW_RECOVERY_KEY(null));
    dispatch(loginError(err, failedCode));
  }
};

// A new recovery key, and the keys derived from it: the auth key for the server and the kek
// that wraps the data key.
const newRecoveryKey = async () => {
  const recoveryKey = generateRecoveryKey();
  const keys = await deriveRecoveryKeys(parseRecoveryKey(recoveryKey)!);
  return { recoveryKey, ...keys };
};

export const login =
  ({ email, password }: ICredentials): TAppThunk =>
  (dispatch) =>
    authenticate(dispatch, async () => {
      const { data: kdf } = await api.post<IPrelogin>("identity/prelogin", {
        email,
      });
      const { authKey, kek } = await deriveKeys(
        password!,
        kdf.salt,
        kdf.iterations
      );

      const { data } = await api.post<IAuthResponse>("identity/login", {
        email,
        password: authKey,
      });

      await saveKey(await unwrapDataKey(data.wrappedKey, kek));
      dispatch(SET_RECOVERY_REMINDER(!data.hasRecoveryKey));
      return data.token;
    });

export const register =
  ({ email, password, invitationCode }: ICredentials): TAppThunk =>
  (dispatch) =>
    authenticate(dispatch, async () => {
      const salt = generateSalt();
      const { authKey, kek } = await deriveKeys(
        password!,
        salt,
        KDF_ITERATIONS
      );
      const recovery = await newRecoveryKey();
      const { wrappedKey, recoveryWrappedKey, dataKey } = await createDataKey(
        kek,
        recovery.kek
      );

      const { data } = await api.post<IAuthResponse>("identity/register", {
        email,
        password: authKey,
        invitationCode,
        salt,
        iterations: KDF_ITERATIONS,
        wrappedKey,
        recovery: { authKey: recovery.authKey, wrappedKey: recoveryWrappedKey },
      });

      await saveKey(dataKey);
      dispatch(SHOW_RECOVERY_KEY(recovery.recoveryKey));
      return data.token;
    });

// Sets a new password with the recovery key and logs in. The used key is replaced by a new one,
// shown once logged in.
export const recover =
  ({ email, recoveryKey, newPassword }: IRecover): TAppThunk =>
  (dispatch) =>
    authenticate(
      dispatch,
      async () => {
        const recoveryBytes = parseRecoveryKey(recoveryKey);
        if (!recoveryBytes) {
          throw codeError("recoveryKeyInvalid");
        }
        const current = await deriveRecoveryKeys(recoveryBytes);
        const { data: start } = await api.post<{ wrappedKey: string }>(
          "identity/recover/start",
          { email, recoveryKey: current.authKey }
        );
        const dataKey = await unwrapDataKey(start.wrappedKey, current.kek);

        const salt = generateSalt();
        const { authKey, kek } = await deriveKeys(
          newPassword,
          salt,
          KDF_ITERATIONS
        );
        const next = await newRecoveryKey();
        const rewrap = (newKek: CryptoKey) =>
          rewrapDataKey(start.wrappedKey, current.kek, newKek);

        const { data } = await api.post<IAuthResponse>("identity/recover", {
          email,
          recoveryKey: current.authKey,
          newPassword: authKey,
          salt,
          iterations: KDF_ITERATIONS,
          wrappedKey: await rewrap(kek),
          newRecovery: {
            authKey: next.authKey,
            wrappedKey: await rewrap(next.kek),
          },
        });

        await saveKey(dataKey);
        dispatch(SHOW_RECOVERY_KEY(next.recoveryKey));
        return data.token;
      },
      "recoveryFailed"
    );

export const attempt =
  (token?: string | null): TAppThunk =>
  async (dispatch): Promise<void> => {
    dispatch(AUTH_FETCHING());
    if (token) {
      dispatch(SET_TOKEN(token));
    }

    await api
      .get<IUser>("identity/me")
      .then((res) => dispatch(SET_USER(res.data as string)))
      .catch((err) => {
        // not logged in, so the stored key is of no use
        clearKey();
        dispatch(authError(err));
      });
  };

// Like authenticate, for an on-device profile: the key never leaves the
// browser and nothing is sent anywhere.
const authenticateLocal = async (
  dispatch: TAppDispatch,
  name: string,
  failedCode: string,
  getKey: () => Promise<CryptoKey>,
) => {
  await endSessions(dispatch);

  try {
    await saveKey(await getKey());
    dispatch(SET_LOCAL_USER(name.trim()));
    requestPersistentStorage();
  } catch (err) {
    await clearKey();
    const code = (err as Error | undefined)?.message;
    if (code !== "localUserExists") {
      console.error(err);
    }
    dispatch(AUTH_ERROR(code === "localUserExists" ? code : failedCode));
  }
};

// a wrong password fails to unwrap the data key
export const localLogin =
  ({ name, password }: ILocalCredentials): TAppThunk =>
  (dispatch) =>
    authenticateLocal(dispatch, name, "failedLocalLogin", async () => {
      const user = await getLocalUser(name);
      if (!user) {
        throw new Error("No such local user");
      }
      const { kek } = await deriveKeys(password, user.salt, user.iterations);
      return unwrapDataKey(user.wrappedKey, kek);
    });

export const localRegister =
  ({ name, password }: ILocalCredentials): TAppThunk =>
  (dispatch) =>
    authenticateLocal(dispatch, name, "failedUserCreate", async () => {
      const salt = generateSalt();
      const { kek } = await deriveKeys(password, salt, KDF_ITERATIONS);
      const { wrappedKey, dataKey } = await createDataKey(kek);
      await addLocalUser({
        name,
        salt,
        iterations: KDF_ITERATIONS,
        wrappedKey,
      });
      return dataKey;
    });

export const logout = (): TAppThunk => (dispatch, getState) => {
  dispatch(AUTH_FETCHING());
  clearKey();
  dispatch(SHOW_RECOVERY_KEY(null));
  dispatch(SET_RECOVERY_REMINDER(false));

  if (getState().auth.isLocal) {
    dispatch(SET_LOCAL_USER(null));
    dispatch(CLEAR_USERDATA());
    return;
  }

  api
    .post("identity/logout")
    .then(() => {
      dispatch(SET_TOKEN(null));
      dispatch(SET_USER(null));
      dispatch(CLEAR_USERDATA());
    })
    .catch((err) => dispatch(authError(err)));
};

// The current password's kek fails to unwrap the data key when it's wrong.
const rewrap = async (
  keys: IKeyMaterial,
  { currentPassword, newPassword }: IChangePassword,
) => {
  const { authKey: currentAuthKey, kek: currentKek } = await deriveKeys(
    currentPassword,
    keys.salt,
    keys.iterations,
  );
  const salt = generateSalt();
  const { authKey, kek } = await deriveKeys(newPassword, salt, KDF_ITERATIONS);

  let wrappedKey: string;
  try {
    wrappedKey = await rewrapDataKey(keys.wrappedKey, currentKek, kek);
  } catch {
    throw new Error("wrongCurrentPassword");
  }

  return {
    currentAuthKey,
    authKey,
    keys: { salt, iterations: KDF_ITERATIONS, wrappedKey },
  };
};

// Changes the password of the account or on-device profile. The data key stays the same, so the
// data and this session's stored key are untouched. Resolves to an error code, or null when done.
export const changePassword =
  (passwords: IChangePassword): TAppThunk<Promise<string | null>> =>
  async (_dispatch, getState) => {
    const { isLocal, user } = getState().auth;
    if (!user) return "userNotFound";

    try {
      if (isLocal) {
        const local = await getLocalUser(user);
        if (!local) return "userNotFound";
        const { keys } = await rewrap(local, passwords);
        await updateLocalUser({ ...local, ...keys });
        return null;
      }

      const { data: current } = await api.get<IKeyMaterial>("identity/keys");
      const { currentAuthKey, authKey, keys } = await rewrap(
        current,
        passwords,
      );
      await api.post("identity/password", {
        currentPassword: currentAuthKey,
        newPassword: authKey,
        ...keys,
      });
      return null;
    } catch (err) {
      if ((err as Error | undefined)?.message === "wrongCurrentPassword") {
        return "wrongCurrentPassword";
      }
      const code = errorCodes(err)?.[0];
      if (!code) {
        console.error(err);
      }
      return code === "failedLogin"
        ? "wrongCurrentPassword"
        : (code ?? "failedPasswordChange");
    }
  };

export const getRecoveryStatus = async () =>
  (await api.get<IRecoveryStatus>("identity/recovery")).data;

// Creates a recovery key for the account, replacing the previous one, and shows it.
// Resolves to an error code, or null when done.
export const setRecoveryKey =
  (currentPassword: string): TAppThunk<Promise<string | null>> =>
  async (dispatch) => {
    try {
      const keys = (await api.get<IKeyMaterial>("identity/keys")).data;
      const { authKey, kek } = await deriveKeys(
        currentPassword,
        keys.salt,
        keys.iterations
      );
      const recovery = await newRecoveryKey();

      let recoveryWrappedKey: string;
      try {
        recoveryWrappedKey = await rewrapDataKey(
          keys.wrappedKey,
          kek,
          recovery.kek
        );
      } catch {
        return "wrongCurrentPassword";
      }

      await api.post("identity/recovery", {
        currentPassword: authKey,
        recovery: { authKey: recovery.authKey, wrappedKey: recoveryWrappedKey },
      });
      dispatch(SET_RECOVERY_REMINDER(false));
      dispatch(SHOW_RECOVERY_KEY(recovery.recoveryKey));
      return null;
    } catch (err) {
      const code = errorCodes(err)?.[0];
      if (!code) {
        console.error(err);
      }
      return code === "failedLogin"
        ? "wrongCurrentPassword"
        : (code ?? "failedRecoveryKey");
    }
  };

// Removes the on-device profile and its data, then logs out.
export const deleteLocalProfile =
  (): TAppThunk =>
  async (dispatch, getState): Promise<void> => {
    const { isLocal, user } = getState().auth;
    if (!isLocal || !user) return;

    await deleteLocalUser(user);
    dispatch(logout());
  };
