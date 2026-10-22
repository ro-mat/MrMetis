import { run } from "./idb";

// Profiles of the on-device mode: everything a server account keeps (key
// derivation settings, the wrapped data key, the encrypted data) lives in
// this browser's IndexedDB instead. Names are matched ignoring case and
// surrounding spaces.
export interface ILocalUser {
  name: string;
  salt: string;
  iterations: number;
  wrappedKey: string;
}

const USERS = "users";
const DATA = "data";
const config = { name: "mrmetis-local", version: 1, stores: [USERS, DATA] };

const id = (name: string) => name.trim().toLocaleLowerCase();

export const listLocalUsers = async (): Promise<string[]> => {
  const users = await run<ILocalUser[]>(config, USERS, "readonly", (tx) =>
    tx.objectStore(USERS).getAll(),
  );
  return users.map((u) => u.name).sort((a, b) => a.localeCompare(b));
};

export const getLocalUser = (name: string) =>
  run<ILocalUser | undefined>(config, USERS, "readonly", (tx) =>
    tx.objectStore(USERS).get(id(name)),
  );

// add() refuses an existing key, so two tabs can't create the same profile
export const addLocalUser = async (user: ILocalUser) => {
  try {
    await run<void>(config, USERS, "readwrite", (tx) =>
      tx
        .objectStore(USERS)
        .add({ ...user, name: user.name.trim() }, id(user.name)),
    );
  } catch (err) {
    if ((err as DOMException | null)?.name === "ConstraintError") {
      throw new Error("localUserExists", { cause: err });
    }
    throw err;
  }
};

export const loadLocalData = (name: string) =>
  run<string | undefined>(config, DATA, "readonly", (tx) =>
    tx.objectStore(DATA).get(id(name)),
  );

export const saveLocalData = (name: string, data: string) =>
  run<void>(config, DATA, "readwrite", (tx) =>
    tx.objectStore(DATA).put(data, id(name)),
  );

export const deleteLocalUser = (name: string) =>
  run<void>(config, [USERS, DATA], "readwrite", (tx) => {
    tx.objectStore(DATA).delete(id(name));
    return tx.objectStore(USERS).delete(id(name));
  });
