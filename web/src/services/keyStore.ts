// Keeps the non-extractable data key in IndexedDB, so it survives reloads and is shared by tabs,
// but scripts can only use it, not read its bytes.
const DB_NAME = "mrmetis";
const STORE = "keys";
const DATA_KEY = "data";

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const run = async <T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest
) => {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = action(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result as T);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
};

export const saveKey = (key: CryptoKey) =>
  run<void>("readwrite", (store) => store.put(key, DATA_KEY));

export const loadKey = async (): Promise<CryptoKey | undefined> => {
  try {
    return await run<CryptoKey | undefined>("readonly", (store) =>
      store.get(DATA_KEY)
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
