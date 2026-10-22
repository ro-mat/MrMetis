// Persistent storage keeps the browser from evicting the site's data (the
// on-device profiles) when it runs low on space. It does not stop the user
// from clearing site data. undefined: the browser doesn't support it.
export const isStoragePersisted = async (): Promise<boolean | undefined> =>
  navigator.storage?.persisted
    ? navigator.storage.persisted().catch(() => undefined)
    : undefined;

// Firefox asks the user, Chromium decides by how the site is used
// (bookmarked, installed, visited often), Safari grants it to installed apps.
export const requestPersistentStorage = async (): Promise<
  boolean | undefined
> =>
  navigator.storage?.persist
    ? navigator.storage.persist().catch(() => false)
    : undefined;
