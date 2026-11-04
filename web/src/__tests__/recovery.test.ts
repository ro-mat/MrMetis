import { configureStore } from "@reduxjs/toolkit";
import authReducer from "store/auth/auth.slice";
import userdataReducer from "store/userdata/userdata.slice";
import uiReducer from "store/ui/ui.slice";
import {
  login,
  logout,
  recover,
  register,
  setRecoveryKey,
} from "store/auth/auth.actions";
import { decrypt, encrypt } from "services/encryptor";
import { loadKey } from "services/keyStore";
import api from "helpers/apiConfiguration";

// the real crypto, with a cheap key derivation
vi.mock("services/encryptor", async (importOriginal) => ({
  ...(await importOriginal<typeof import("services/encryptor")>()),
  KDF_ITERATIONS: 1000,
}));

const keys = vi.hoisted(() => new Map<string, CryptoKey>());
vi.mock("services/keyStore", () => ({
  saveKey: vi.fn(async (key: CryptoKey) => void keys.set("data", key)),
  loadKey: vi.fn(async () => keys.get("data")),
  clearKey: vi.fn(async () => void keys.delete("data")),
}));

// One account on a server that stores what the API stores, comparing auth keys instead of hashes
const server = vi.hoisted(() => ({
  email: "",
  authKey: "",
  salt: "",
  iterations: 0,
  wrappedKey: "",
  recovery: null as { authKey: string; wrappedKey: string } | null,
}));

vi.mock("helpers/apiConfiguration", () => {
  const fail = (code: string) => {
    throw { data: { errors: [code] } };
  };
  const loggedIn = () => ({
    data: {
      token: "token",
      wrappedKey: server.wrappedKey,
      hasRecoveryKey: !!server.recovery,
    },
  });
  type Body = Record<string, never>;
  const routes: Record<string, (body: Body) => unknown> = {
    "identity/register": (b) => {
      Object.assign(server, {
        email: b.email,
        authKey: b.password,
        salt: b.salt,
        iterations: b.iterations,
        wrappedKey: b.wrappedKey,
        recovery: b.recovery ?? null,
      });
      return loggedIn();
    },
    "identity/prelogin": () => ({
      data: { salt: server.salt, iterations: server.iterations },
    }),
    "identity/login": (b) =>
      b.email === server.email && b.password === server.authKey
        ? loggedIn()
        : fail("failedLogin"),
    "identity/logout": () => ({}),
    "identity/recovery": (b) => {
      if (b.currentPassword !== server.authKey) fail("failedLogin");
      server.recovery = b.recovery;
      return {};
    },
    "identity/recover/start": (b) =>
      b.email === server.email && b.recoveryKey === server.recovery?.authKey
        ? { data: { wrappedKey: server.recovery!.wrappedKey } }
        : fail("recoveryFailed"),
    "identity/recover": (b) => {
      if (
        b.email !== server.email ||
        b.recoveryKey !== server.recovery?.authKey
      ) {
        fail("recoveryFailed");
      }
      Object.assign(server, {
        authKey: b.newPassword,
        salt: b.salt,
        iterations: b.iterations,
        wrappedKey: b.wrappedKey,
        recovery: b.newRecovery,
      });
      return loggedIn();
    },
  };
  return {
    default: {
      get: vi.fn(async (url: string) => {
        if (url === "identity/me") return { data: server.email };
        if (url === "identity/keys") {
          return {
            data: {
              salt: server.salt,
              iterations: server.iterations,
              wrappedKey: server.wrappedKey,
            },
          };
        }
        throw new Error(`unexpected GET ${url}`);
      }),
      post: vi.fn(async (url: string, body: Body) => {
        const route = routes[url];
        if (!route) throw new Error(`unexpected POST ${url}`);
        return route(body);
      }),
    },
  };
});

const EMAIL = "user@email.com";
const PASSWORD = "password";
const NEW_PASSWORD = "new password";

const createStore = () =>
  configureStore({
    reducer: { auth: authReducer, data: userdataReducer, ui: uiReducer },
  });

type TStore = ReturnType<typeof createStore>;

// registers, encrypts some data with the data key and logs out; resolves to the shown recovery key
const registerWithData = async (store: TStore) => {
  await store.dispatch(register({ email: EMAIL, password: PASSWORD }));
  const recoveryKey = store.getState().auth.shownRecoveryKey!;
  const encrypted = await encrypt({ a: 1 }, (await loadKey())!);
  store.dispatch(logout());
  return { recoveryKey, encrypted };
};

const posts = (url: string) =>
  vi.mocked(api.post).mock.calls.filter(([u]) => u === url);

describe("account recovery", () => {
  beforeEach(() => {
    localStorage.clear();
    keys.clear();
    vi.mocked(api.post).mockClear();
  });

  it("shows a recovery key at registration", async () => {
    const store = createStore();
    await store.dispatch(register({ email: EMAIL, password: PASSWORD }));

    const shown = store.getState().auth.shownRecoveryKey;
    expect(shown).toMatch(/^([A-Z2-7]{4}-){6}[A-Z2-7]{2}$/);
    expect(server.recovery).not.toBeNull();
    // the server gets neither the key nor anything to read the data with
    expect(JSON.stringify(posts("identity/register"))).not.toContain(shown);
    expect(store.getState().auth.recoveryReminder).toBe(false);
  });

  it("sets a new password with the recovery key and keeps the data", async () => {
    const store = createStore();
    const { recoveryKey, encrypted } = await registerWithData(store);

    await store.dispatch(
      recover({
        email: EMAIL,
        recoveryKey: recoveryKey.toLowerCase(),
        newPassword: NEW_PASSWORD,
      })
    );

    expect(store.getState().auth.err).toBeNull();
    expect(store.getState().auth.token).toBe("token");
    expect(await decrypt(encrypted, (await loadKey())!)).toEqual({ a: 1 });
    // the used key is replaced by a new one, shown once logged in
    const newKey = store.getState().auth.shownRecoveryKey;
    expect(newKey).toBeTruthy();
    expect(newKey).not.toBe(recoveryKey);

    store.dispatch(logout());
    await store.dispatch(login({ email: EMAIL, password: PASSWORD }));
    expect(store.getState().auth.err).toBe("failedLogin");
    await store.dispatch(login({ email: EMAIL, password: NEW_PASSWORD }));
    expect(store.getState().auth.err).toBeNull();
    expect(await decrypt(encrypted, (await loadKey())!)).toEqual({ a: 1 });

    // the old recovery key no longer works, the new one does
    store.dispatch(logout());
    await store.dispatch(
      recover({ email: EMAIL, recoveryKey, newPassword: PASSWORD })
    );
    expect(store.getState().auth.err).toBe("recoveryFailed");
    await store.dispatch(
      recover({ email: EMAIL, recoveryKey: newKey!, newPassword: PASSWORD })
    );
    expect(store.getState().auth.err).toBeNull();
  });

  it("refuses a wrong or mistyped recovery key", async () => {
    const store = createStore();
    await registerWithData(store);

    await store.dispatch(
      recover({
        email: EMAIL,
        recoveryKey: "AAAQ-EAYE-AUDA-OCAJ-BIFQ-YDIO-B4",
        newPassword: NEW_PASSWORD,
      })
    );
    expect(store.getState().auth.err).toBe("recoveryFailed");
    expect(store.getState().auth.token).toBeNull();
    expect(keys.size).toBe(0);

    await store.dispatch(
      recover({ email: EMAIL, recoveryKey: "nope", newPassword: NEW_PASSWORD })
    );
    expect(store.getState().auth.err).toBe("recoveryKeyInvalid");
    expect(posts("identity/recover")).toHaveLength(0);
  });

  it("replaces the recovery key from Preferences", async () => {
    const store = createStore();
    const { recoveryKey, encrypted } = await registerWithData(store);
    await store.dispatch(login({ email: EMAIL, password: PASSWORD }));

    expect(await store.dispatch(setRecoveryKey("wrong"))).toBe(
      "wrongCurrentPassword"
    );
    expect(posts("identity/recovery")).toHaveLength(0);

    expect(await store.dispatch(setRecoveryKey(PASSWORD))).toBeNull();
    const newKey = store.getState().auth.shownRecoveryKey!;
    expect(newKey).not.toBe(recoveryKey);

    store.dispatch(logout());
    await store.dispatch(
      recover({ email: EMAIL, recoveryKey, newPassword: NEW_PASSWORD })
    );
    expect(store.getState().auth.err).toBe("recoveryFailed");
    await store.dispatch(
      recover({ email: EMAIL, recoveryKey: newKey, newPassword: NEW_PASSWORD })
    );
    expect(await decrypt(encrypted, (await loadKey())!)).toEqual({ a: 1 });
  });

  it("reminds after login when the account has no recovery key", async () => {
    const store = createStore();
    await registerWithData(store);
    server.recovery = null;

    await store.dispatch(login({ email: EMAIL, password: PASSWORD }));
    expect(store.getState().auth.recoveryReminder).toBe(true);

    store.dispatch(logout());
    expect(store.getState().auth.recoveryReminder).toBe(false);
  });
});
