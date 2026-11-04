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

// HKDF splits a master key into independent auth and encryption keys.
const splitKeys = async (
  masterKey: CryptoKey,
  authInfo: string,
  kekInfo: string
): Promise<IDerivedKeys> => {
  const authBits = await subtle().deriveBits(hkdf(authInfo), masterKey, 256);
  const kek = await subtle().deriveKey(
    hkdf(kekInfo),
    masterKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"]
  );
  return { authKey: toHex(authBits), kek };
};

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

  return splitKeys(masterKey, "mrmetis-auth", "mrmetis-kek");
};

// Recovery keys: 128 random bits shown as base32 (RFC 4648) in groups of four.
const RECOVERY_KEY_BYTES = 16;
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
// 26 characters hold the 128 bits, the last one has 2 unused bits
const RECOVERY_KEY_CHARS = Math.ceil((RECOVERY_KEY_BYTES * 8) / 5);

const toBase32 = (bytes: Uint8Array) => {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32[(value << (5 - bits)) & 31];
  }
  return out;
};

export const generateRecoveryKey = () =>
  toBase32(randomBytes(RECOVERY_KEY_BYTES))
    .match(/.{1,4}/g)!
    .join("-");

// Forgiving about how it was typed: case, spaces, dashes, and digits that
// look like letters the alphabet has. Null when it isn't a recovery key.
export const parseRecoveryKey = (
  input: string
): Uint8Array<ArrayBuffer> | null => {
  const chars = input
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/0/g, "O")
    .replace(/1/g, "I")
    .replace(/8/g, "B");
  if (chars.length !== RECOVERY_KEY_CHARS) return null;

  const bytes = new Uint8Array(RECOVERY_KEY_BYTES);
  let bits = 0;
  let value = 0;
  let index = 0;
  for (const char of chars) {
    const digit = BASE32.indexOf(char);
    if (digit < 0) return null;
    value = ((value << 5) | digit) & 0xfff;
    bits += 5;
    if (bits >= 8) {
      bytes[index++] = (value >>> (bits - 8)) & 0xff;
      bits -= 8;
    }
  }
  // the unused bits are always zero, which catches some typos in the last character
  return (value & ((1 << bits) - 1)) === 0 ? bytes : null;
};

// The recovery key is random already, so HKDF alone is enough to derive from it.
export const deriveRecoveryKeys = async (
  recoveryKey: Uint8Array<ArrayBuffer>
): Promise<IDerivedKeys> => {
  const masterKey = await subtle().importKey(
    "raw",
    recoveryKey,
    "HKDF",
    false,
    ["deriveBits", "deriveKey"]
  );
  return splitKeys(masterKey, "mrmetis-recovery-auth", "mrmetis-recovery-kek");
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

// Returns the wrapped key for the server and a non-extractable copy for this browser,
// and the same key wrapped with `recoveryKek` when given.
export const createDataKey = async (kek: CryptoKey, recoveryKek?: CryptoKey) => {
  const extractable = await subtle().generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const wrappedKey = await wrapDataKey(extractable, kek);
  const recoveryWrappedKey = recoveryKek
    ? await wrapDataKey(extractable, recoveryKek)
    : undefined;

  return {
    wrappedKey,
    recoveryWrappedKey,
    dataKey: await unwrapDataKey(wrappedKey, kek),
  };
};

// For a password change or a recovery key: the same data key wrapped with the new password's kek, so the data
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
