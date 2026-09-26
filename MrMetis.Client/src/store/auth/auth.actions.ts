import api from "../../helpers/apiConfiguration";
import {
  createDataKey,
  deriveKeys,
  generateSalt,
  KDF_ITERATIONS,
  unwrapDataKey,
} from "services/encryptor";
import { clearKey, saveKey } from "services/keyStore";
import { TAppDispatch, TAppThunk } from "store/store";
import {
  AUTH_ERROR,
  AUTH_FETCHING,
  SET_ISDEMO,
  SET_TOKEN,
  SET_USER,
} from "./auth.slice";
import { IAuthResponse, ICredentials, IPrelogin, IUser } from "./auth.types";
import { CLEAR_USERDATA } from "store/userdata/userdata.slice";
import { clearDemoData } from "helpers/demoHelper";

const authError = (err: any) => AUTH_ERROR(err?.data?.errors?.join(", "));

// crypto failures have no server error code
const loginError = (err: any) => {
  if (!err?.data?.errors) {
    console.error(err);
  }
  return AUTH_ERROR(err?.data?.errors?.join(", ") ?? "failedLogin");
};

// Shared by login and register: resolves to the token once the data key is stored.
// Userdata is loaded by App once the user is set.
const authenticate = async (
  dispatch: TAppDispatch,
  getToken: () => Promise<string>
) => {
  dispatch(AUTH_FETCHING());
  dispatch(CLEAR_USERDATA());
  clearDemoData();
  dispatch(SET_ISDEMO(false));
  await clearKey();

  try {
    const token = await getToken();
    dispatch(attempt(token));
  } catch (err) {
    await clearKey();
    dispatch(loginError(err));
  }
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
      const { wrappedKey, dataKey } = await createDataKey(kek);

      const { data } = await api.post<IAuthResponse>("identity/register", {
        email,
        password: authKey,
        invitationCode,
        salt,
        iterations: KDF_ITERATIONS,
        wrappedKey,
      });

      await saveKey(dataKey);
      return data.token;
    });

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

export const logout = (): TAppThunk => (dispatch) => {
  dispatch(AUTH_FETCHING());
  clearKey();

  api
    .post("identity/logout")
    .then(() => {
      dispatch(SET_TOKEN(null));
      dispatch(SET_USER(null));
      dispatch(CLEAR_USERDATA());
    })
    .catch((err) => dispatch(authError(err)));
};
