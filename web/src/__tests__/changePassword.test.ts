import { configureStore } from "@reduxjs/toolkit";
import authReducer, { SET_TOKEN, SET_USER } from "store/auth/auth.slice";
import userdataReducer from "store/userdata/userdata.slice";
import uiReducer from "store/ui/ui.slice";
import { changePassword } from "store/auth/auth.actions";
import {
  createDataKey,
  decrypt,
  deriveKeys,
  encrypt,
  unwrapDataKey,
} from "services/encryptor";
import api from "helpers/apiConfiguration";

// the real crypto, with a cheap key derivation
vi.mock("services/encryptor", async (importOriginal) => ({
  ...(await importOriginal<typeof import("services/encryptor")>()),
  KDF_ITERATIONS: 1000,
}));

// A server that keeps the key material and checks the auth key like the API does
const server = vi.hoisted(() => ({
  authKey: "",
  keys: { salt: "", iterations: 0, wrappedKey: "" },
}));
vi.mock("helpers/apiConfiguration", () => ({
  default: {
    get: vi.fn(async (url: string) => {
      if (url !== "identity/keys") throw new Error(`unexpected ${url}`);
      return { data: { ...server.keys } };
    }),
    post: vi.fn(async (url: string, body: Record<string, unknown>) => {
      if (url !== "identity/password") throw new Error(`unexpected ${url}`);
      if (body.currentPassword !== server.authKey) {
        throw { data: { errors: ["failedLogin"] } };
      }
      server.authKey = body.newPassword as string;
      server.keys = {
        salt: body.salt as string,
        iterations: body.iterations as number,
        wrappedKey: body.wrappedKey as string,
      };
      return { data: undefined };
    }),
  },
}));

const SALT = "AAECAwQFBgcICQoLDA0ODw==";
const PASSWORD = "password";
const NEW_PASSWORD = "new password";

const createStore = () => {
  const store = configureStore({
    reducer: { auth: authReducer, data: userdataReducer, ui: uiReducer },
  });
  store.dispatch(SET_TOKEN("token"));
  store.dispatch(SET_USER("user@email.com"));
  return store;
};

describe("changing the account password", () => {
  let encrypted: string;

  beforeEach(async () => {
    localStorage.clear();
    vi.mocked(api.post).mockClear();
    const { authKey, kek } = await deriveKeys(PASSWORD, SALT, 1000);
    const { wrappedKey, dataKey } = await createDataKey(kek);
    server.authKey = authKey;
    server.keys = { salt: SALT, iterations: 1000, wrappedKey };
    encrypted = await encrypt({ a: 1 }, dataKey);
  });

  it("rewraps the data key for the new password", async () => {
    const store = createStore();

    const error = await store.dispatch(
      changePassword({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD }),
    );

    expect(error).toBeNull();
    expect(server.keys.salt).not.toBe(SALT);
    const { authKey, kek } = await deriveKeys(
      NEW_PASSWORD,
      server.keys.salt,
      server.keys.iterations,
    );
    expect(server.authKey).toBe(authKey);
    const dataKey = await unwrapDataKey(server.keys.wrappedKey, kek);
    expect(await decrypt(encrypted, dataKey)).toEqual({ a: 1 });
    // the session stays
    expect(store.getState().auth.token).toBe("token");
  });

  it("refuses a wrong current password without asking the server", async () => {
    const store = createStore();
    const before = { ...server.keys };

    const error = await store.dispatch(
      changePassword({ currentPassword: "wrong", newPassword: NEW_PASSWORD }),
    );

    expect(error).toBe("wrongCurrentPassword");
    expect(api.post).not.toHaveBeenCalled();
    expect(server.keys).toEqual(before);
  });

  it("maps the server's refusal to a wrong current password", async () => {
    const store = createStore();
    // the server knows another auth key, e.g. the password was changed elsewhere
    server.authKey = "other";

    const error = await store.dispatch(
      changePassword({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD }),
    );

    expect(error).toBe("wrongCurrentPassword");
  });
});
