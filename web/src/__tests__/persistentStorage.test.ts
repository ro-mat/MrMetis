import {
  isStoragePersisted,
  requestPersistentStorage,
} from "services/persistentStorage";

describe("persistent storage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("is unknown where the browser doesn't support it", async () => {
    vi.stubGlobal("navigator", { ...navigator, storage: undefined });
    expect(await isStoragePersisted()).toBeUndefined();
    expect(await requestPersistentStorage()).toBeUndefined();
  });

  it("tells what the browser answers", async () => {
    const persist = vi.fn(async () => true);
    vi.stubGlobal("navigator", {
      ...navigator,
      storage: { persisted: async () => false, persist },
    });
    expect(await isStoragePersisted()).toBe(false);
    expect(await requestPersistentStorage()).toBe(true);
    expect(persist).toHaveBeenCalled();
  });

  it("counts a failed request as declined", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      storage: { persist: () => Promise.reject(new Error("denied")) },
    });
    expect(await requestPersistentStorage()).toBe(false);
  });
});
