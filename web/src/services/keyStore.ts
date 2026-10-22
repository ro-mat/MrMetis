import { run as runIdb } from "./idb";

// Keeps the non-extractable data key in IndexedDB, so it survives reloads and is shared by tabs,
// but scripts can only use it, not read its bytes.
const STORE = "keys";
const DATA_KEY = "data";
const config = { name: "mrmetis", version: 1, stores: [STORE] };

const run = <T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest,
) => runIdb<T>(config, STORE, mode, (tx) => action(tx.objectStore(STORE)));

export const saveKey = (key: CryptoKey) =>
  run<void>("readwrite", (store) => store.put(key, DATA_KEY));

export const loadKey = async (): Promise<CryptoKey | undefined> => {
  try {
    return await run<CryptoKey | undefined>("readonly", (store) =>
      store.get(DATA_KEY),
    );
  } catch {
    return undefined;
  }
};

export const clearKey = async () => {
  try {
    await run<void>("readwrite", (store) => store.delete(DATA_KEY));
  } catch {
    // nothing stored or storage unavailable
  }
};
