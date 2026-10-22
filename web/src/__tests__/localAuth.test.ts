import { configureStore } from "@reduxjs/toolkit";
import authReducer, { SET_TOKEN } from "store/auth/auth.slice";
import userdataReducer, {
  ADD_ACCOUNT,
  SAVE_CHANGES,
  SET_USERDATA,
} from "store/userdata/userdata.slice";
import uiReducer from "store/ui/ui.slice";
import {
  deleteLocalProfile,
  localLogin,
  localRegister,
  logout,
} from "store/auth/auth.actions";
import { loadUserdata, saveUserData } from "store/userdata/userdata.actions";
import { selectIsAuthenticated } from "store/auth/auth.selectors";
import { selectStorageWarning } from "store/userdata/userdata.selectors";
import { saveLocalData } from "services/localUsers";
import { requestPersistentStorage } from "services/persistentStorage";
import api from "helpers/apiConfiguration";
import i18n from "locales/i18n";

// on-device mode must never reach the server
vi.mock("helpers/apiConfiguration", () => ({
  default: {
    get: vi.fn(() => Promise.reject(new Error("api called"))),
    post: vi.fn(() => Promise.reject(new Error("api called"))),
  },
}));

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

const db = vi.hoisted(() => ({
  users: new Map<string, unknown>(),
  data: new Map<string, string>(),
}));
vi.mock("services/persistentStorage", () => ({
  isStoragePersisted: vi.fn(async () => false),
  requestPersistentStorage: vi.fn(async () => true),
}));
vi.mock("services/localUsers", () => {
  const id = (name: string) => name.trim().toLocaleLowerCase();
  return {
    listLocalUsers: vi.fn(async () => [...db.users.keys()]),
    getLocalUser: vi.fn(async (name: string) => db.users.get(id(name))),
    addLocalUser: vi.fn(async (user: { name: string }) => {
      if (db.users.has(id(user.name))) throw new Error("localUserExists");
      db.users.set(id(user.name), user);
    }),
    loadLocalData: vi.fn(async (name: string) => db.data.get(id(name))),
    saveLocalData: vi.fn(async (name: string, data: string) => {
      db.data.set(id(name), data);
    }),
    deleteLocalUser: vi.fn(async (name: string) => {
      db.users.delete(id(name));
      db.data.delete(id(name));
    }),
  };
});

const createStore = () =>
  configureStore({
    reducer: { auth: authReducer, data: userdataReducer, ui: uiReducer },
  });

type TStore = ReturnType<typeof createStore>;

const alice = { name: "Alice", password: "alice-password" };
const bob = { name: "Bob", password: "bob-password" };

const addAccount = async (store: TStore, name: string) => {
  store.dispatch(ADD_ACCOUNT({ id: 0, name, leftFromPrevMonth: [] } as never));
  await store.dispatch(saveUserData());
};

const accountNames = (store: TStore) =>
  store.getState().data.userdata.accounts.map((a) => a.name);

describe("on-device profiles", () => {
  beforeAll(() => i18n.changeLanguage("en"));

  beforeEach(() => {
    localStorage.clear();
    keys.clear();
    db.users.clear();
    db.data.clear();
    vi.mocked(api.get).mockClear();
    vi.mocked(api.post).mockClear();
    vi.mocked(requestPersistentStorage).mockClear();
  });

  afterEach(() => {
    expect(api.get).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("registers, saves, logs out and logs in again", async () => {
    const store = createStore();
    await store.dispatch(localRegister(alice));
    expect(selectIsAuthenticated(store.getState() as never)).toBe(true);
    expect(store.getState().auth.user).toBe("Alice");
    expect(localStorage.getItem("localUser")).toBe("Alice");

    await store.dispatch(loadUserdata());
    await addAccount(store, "Cash");
    // stored encrypted
    expect(db.data.get("alice")).not.toContain("Cash");

    store.dispatch(logout());
    expect(selectIsAuthenticated(store.getState() as never)).toBe(false);
    expect(localStorage.getItem("localUser")).toBeNull();

    await store.dispatch(localLogin({ ...alice, name: " alice " }));
    await store.dispatch(loadUserdata());
    expect(accountNames(store)).toEqual(["Cash"]);
  });

  it("asks the browser to keep the data once a profile is open", async () => {
    const store = createStore();
    await store.dispatch(localRegister(alice));
    store.dispatch(logout());
    await store.dispatch(localLogin(alice));
    expect(requestPersistentStorage).toHaveBeenCalledTimes(2);

    store.dispatch(logout());
    await store.dispatch(localLogin({ ...alice, password: "wrong-password" }));
    expect(requestPersistentStorage).toHaveBeenCalledTimes(2);
  });

  it("refuses a wrong password and an unknown profile", async () => {
    const store = createStore();
    await store.dispatch(localRegister(alice));
    store.dispatch(logout());

    await store.dispatch(localLogin({ ...alice, password: "wrong-password" }));
    expect(store.getState().auth.err).toBe("failedLocalLogin");
    expect(selectIsAuthenticated(store.getState() as never)).toBe(false);
    expect(keys.size).toBe(0);

    await store.dispatch(localLogin({ ...alice, name: "Carol" }));
    expect(store.getState().auth.err).toBe("failedLocalLogin");
  });

  it("refuses a second profile with the same name", async () => {
    const store = createStore();
    await store.dispatch(localRegister(alice));
    store.dispatch(logout());

    await store.dispatch(localRegister({ ...bob, name: "ALICE" }));
    expect(store.getState().auth.err).toBe("localUserExists");
    expect(store.getState().auth.isLocal).toBe(false);
  });

  it("keeps the data of each profile apart", async () => {
    const store = createStore();
    await store.dispatch(localRegister(alice));
    await store.dispatch(loadUserdata());
    await addAccount(store, "Alice's");
    store.dispatch(logout());

    await store.dispatch(localRegister(bob));
    await store.dispatch(loadUserdata());
    expect(accountNames(store)).toEqual([]);
    await addAccount(store, "Bob's");
    store.dispatch(logout());

    await store.dispatch(localLogin(alice));
    await store.dispatch(loadUserdata());
    expect(accountNames(store)).toEqual(["Alice's"]);
  });

  it("ends a server session and the demo when a profile is opened", async () => {
    const store = createStore();
    store.dispatch(SET_TOKEN("server-token"));
    localStorage.setItem("demoData", "{}");

    await store.dispatch(localRegister(alice));
    expect(store.getState().auth.token).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("demoData")).toBeNull();
    expect(store.getState().auth.isDemo).toBe(false);
  });

  it("shows the usage against the browser's quota", async () => {
    const store = createStore();
    await store.dispatch(localRegister(alice));
    await store.dispatch(loadUserdata());
    // nothing stored yet, and jsdom has no quota to tell
    expect(store.getState().data.storage).toEqual({
      usedBytes: 0,
      limitBytes: undefined,
    });
    expect(selectStorageWarning(store.getState() as never)).toBe(false);

    vi.stubGlobal("navigator", {
      ...navigator,
      storage: { estimate: async () => ({ quota: 1000, usage: 0 }) },
    });
    try {
      await addAccount(store, "Cash");
      expect(store.getState().data.storage).toEqual({
        usedBytes: db.data.get("alice")!.length,
        limitBytes: 1000,
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("deletes the profile and its data", async () => {
    const store = createStore();
    await store.dispatch(localRegister(alice));
    await store.dispatch(loadUserdata());
    await addAccount(store, "Cash");

    await store.dispatch(deleteLocalProfile());
    expect(db.users.size).toBe(0);
    expect(db.data.size).toBe(0);
    expect(store.getState().auth.isLocal).toBe(false);
  });

  it("tells when the browser has no space left", async () => {
    const store = createStore();
    await store.dispatch(localRegister(alice));
    store.dispatch(SET_USERDATA({}));

    vi.mocked(saveLocalData).mockRejectedValueOnce(
      new DOMException("full", "QuotaExceededError"),
    );
    store.dispatch(SAVE_CHANGES());
    await store.dispatch(saveUserData());
    expect(store.getState().data.saveFailed).toBe(true);
    expect(store.getState().ui.messages.map((m) => m.message)).toEqual([
      i18n.t("errors.localStorageFull"),
    ]);

    store.dispatch(SAVE_CHANGES());
    await store.dispatch(saveUserData());
    expect(store.getState().data.saveFailed).toBe(false);
  });
});
