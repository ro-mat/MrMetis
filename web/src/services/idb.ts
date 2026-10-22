// Small promise wrapper around IndexedDB: opens the database for each call
// and resolves once the transaction completes.
export interface IIdbConfig {
  name: string;
  version: number;
  stores: string[];
}

const openDb = ({ name, version, stores }: IIdbConfig) =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onupgradeneeded = () => {
      for (const store of stores) {
        if (!request.result.objectStoreNames.contains(store)) {
          request.result.createObjectStore(store);
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

// Runs `action` in one transaction over `storeNames` and resolves with the
// result of the request it returns.
export const run = async <T>(
  config: IIdbConfig,
  storeNames: string | string[],
  mode: IDBTransactionMode,
  action: (tx: IDBTransaction) => IDBRequest,
) => {
  const db = await openDb(config);
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeNames, mode);
      const request = action(tx);
      tx.oncomplete = () => resolve(request.result as T);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
};
