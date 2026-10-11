import { configureStore } from "@reduxjs/toolkit";
import authReducer from "store/auth/auth.slice";
import userdataReducer, {
  SAVE_CHANGES,
  SET_USERDATA,
} from "store/userdata/userdata.slice";
import uiReducer from "store/ui/ui.slice";
import { loadUserdata, saveUserData } from "store/userdata/userdata.actions";
import { selectStorageWarning } from "store/userdata/userdata.selectors";
import { formatBytes } from "helpers/numberHelper";
import api from "helpers/apiConfiguration";
import i18n from "locales/i18n";

vi.mock("helpers/apiConfiguration", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));
vi.mock("services/keyStore", () => ({
  loadKey: vi.fn(async () => ({})),
}));
vi.mock("services/encryptor", () => ({
  encrypt: vi.fn(async () => "encrypted"),
  decrypt: vi.fn(async () => ({})),
}));

const createStore = () =>
  configureStore({
    reducer: { auth: authReducer, data: userdataReducer, ui: uiReducer },
  });

const usage = (usedBytes: number, limitBytes = 100) => ({
  usedBytes,
  limitBytes,
});

const limitExceeded = { data: { title: "storageLimitExceeded" } };

describe("storage", () => {
  beforeAll(() => i18n.changeLanguage("en"));

  beforeEach(() => {
    localStorage.clear();
    vi.mocked(api.post).mockReset();
  });

  it("formatBytes shows B, KB and MB", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(12 * 1024)).toBe("12 KB");
    expect(formatBytes(1.5 * 1024 * 1024)).toBe("1.5 MB");
    expect(formatBytes(10 * 1024 * 1024)).toBe("10 MB");
  });

  it("loads the usage and warns from 95% of the limit", async () => {
    const store = createStore();
    vi.mocked(api.get).mockResolvedValue({
      data: { data: "encrypted", usage: usage(94) },
    });

    await store.dispatch(loadUserdata());
    expect(store.getState().data.storage).toEqual(usage(94));
    expect(selectStorageWarning(store.getState() as never)).toBe(false);

    vi.mocked(api.get).mockResolvedValue({
      data: { data: "encrypted", usage: usage(95) },
    });
    await store.dispatch(loadUserdata());
    expect(selectStorageWarning(store.getState() as never)).toBe(true);
  });

  it("tells about a refused save and about the next successful one", async () => {
    const store = createStore();
    store.dispatch(SET_USERDATA({}));
    const toasts = () =>
      store.getState().ui.messages.map((m) => [m.appearance, m.message]);

    vi.mocked(api.post).mockRejectedValue(limitExceeded);
    store.dispatch(SAVE_CHANGES());
    await store.dispatch(saveUserData());
    expect(store.getState().data.saveFailed).toBe(true);
    expect(store.getState().data.savePending).toBe(false);
    expect(toasts()).toEqual([
      ["error", expect.stringContaining("storage limit")],
    ]);

    vi.mocked(api.post).mockResolvedValue({ data: { usage: usage(50) } });
    await store.dispatch(saveUserData());
    expect(store.getState().data.saveFailed).toBe(false);
    expect(store.getState().data.storage).toEqual(usage(50));
    expect(toasts()[1]).toEqual(["success", "Saved successfully"]);

    // only the first save after a failure is announced
    await store.dispatch(saveUserData());
    expect(toasts()).toHaveLength(2);
  });
});
