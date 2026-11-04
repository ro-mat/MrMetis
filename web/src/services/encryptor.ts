// Keep in sync with api/MrMetis.Core/Kdf.cs
export const KDF_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

// Additional data binds a ciphertext to its purpose, so a wrapped key can't be passed off as userdata
const DATA_AAD = "mrmetis-userdata";
const KEY_AAD = "mrmetis-dek";

const subtle = () => globalThis.crypto.subtle;
const utf8 = new TextEncoder();

// chunked, spreading a large userdata blob at once overflows the call stack
const toBase64 = (buffer: ArrayBuffer | Uint8Array) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

const fromBase64 = (str: string) =>
  Uint8Array.from(atob(str), (c) => c.charCodeAt(0));

const toHex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");

const randomBytes = (length: number) =>
  globalThis.crypto.getRandomValues(new Uint8Array(length));

interface IEnvelope {
  iv: string;
  ct: string;
}

const seal = (iv: Uint8Array, ct: ArrayBuffer) =>
  JSON.stringify({ iv: toBase64(iv), ct: toBase64(ct) } as IEnvelope);

const open = (str: string) => {
  const envelope = JSON.parse(str) as IEnvelope;
  return { iv: fromBase64(envelope.iv), ct: fromBase64(envelope.ct) };
};

const hkdf = (info: string) => ({
  name: "HKDF",
  hash: "SHA-256",
  salt: new Uint8Array(),
  info: utf8.encode(info),
});

export interface IDerivedKeys {
  // sent to the server instead of the password
  authKey: string;
  // wraps the data key, never leaves the browser
  kek: CryptoKey;
}

export const generateSalt = () => toBase64(randomBytes(SALT_BYTES));

// PBKDF2 does the slow part once, HKDF splits the result into independent auth and encryption keys.
export const deriveKeys = async (
  password: string,
  salt: string,
  iterations: number
): Promise<IDerivedKeys> => {
  const passwordKey = await subtle().importKey(
    "raw",
    utf8.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const masterBits = await subtle().deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: fromBase64(salt), iterations },
    passwordKey,
    256
  );
  const masterKey = await subtle().importKey("raw", masterBits, "HKDF", false, [
    "deriveBits",
    "deriveKey",
  ]);

  const authBits = await subtle().deriveBits(
    hkdf("mrmetis-auth"),
    masterKey,
    256
  );
  const kek = await subtle().deriveKey(
    hkdf("mrmetis-kek"),
    masterKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"]
  );

  return { authKey: toHex(authBits), kek };
};

export const unwrapDataKey = async (
  wrappedKey: string,
  kek: CryptoKey
): Promise<CryptoKey> => {
  const { iv, ct } = open(wrappedKey);
  return subtle().unwrapKey(
    "raw",
    ct,
    kek,
    { name: "AES-GCM", iv, additionalData: utf8.encode(KEY_AAD) },
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

const wrapDataKey = async (extractable: CryptoKey, kek: CryptoKey) => {
  const iv = randomBytes(IV_BYTES);
  const ct = await subtle().wrapKey("raw", extractable, kek, {
    name: "AES-GCM",
    iv,
    additionalData: utf8.encode(KEY_AAD),
  });
  return seal(iv, ct);
};

// Returns the wrapped key for the server and a non-extractable copy for this browser.
export const createDataKey = async (kek: CryptoKey) => {
  const extractable = await subtle().generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const wrappedKey = await wrapDataKey(extractable, kek);

  return { wrappedKey, dataKey: await unwrapDataKey(wrappedKey, kek) };
};

// For a password change: the same data key wrapped with the new password's kek, so the data
// needs no re-encryption. The extractable copy exists only inside this function.
// Throws if `oldKek` is wrong.
export const rewrapDataKey = async (
  wrappedKey: string,
  oldKek: CryptoKey,
  newKek: CryptoKey
): Promise<string> => {
  const { iv, ct } = open(wrappedKey);
  const extractable = await subtle().unwrapKey(
    "raw",
    ct,
    oldKek,
    { name: "AES-GCM", iv, additionalData: utf8.encode(KEY_AAD) },
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  return wrapDataKey(extractable, newKek);
};

export const encrypt = async (
  obj: unknown,
  key: CryptoKey
): Promise<string> => {
  const iv = randomBytes(IV_BYTES);
  const ct = await subtle().encrypt(
    { name: "AES-GCM", iv, additionalData: utf8.encode(DATA_AAD) },
    key,
    utf8.encode(JSON.stringify(obj ?? {}))
  );
  return seal(iv, ct);
};

// Throws if the data was tampered with or the key is wrong.
export const decrypt = async <T>(
  str: string | null | undefined,
  key: CryptoKey
): Promise<T> => {
  if (!str) {
    return {} as T;
  }

  const { iv, ct } = open(str);
  const plain = await subtle().decrypt(
    { name: "AES-GCM", iv, additionalData: utf8.encode(DATA_AAD) },
    key,
    ct
  );
  return JSON.parse(new TextDecoder().decode(plain)) as T;
};
