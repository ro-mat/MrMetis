import {
  createDataKey,
  decrypt,
  deriveKeys,
  encrypt,
  deriveRecoveryKeys,
  generateRecoveryKey,
  generateSalt,
  parseRecoveryKey,
  rewrapDataKey,
  unwrapDataKey,
} from "services/encryptor";

// low iteration count keeps the tests fast, the scheme is the same
const ITERATIONS = 1000;
const SALT = "AAECAwQFBgcICQoLDA0ODw==";

const newDataKey = async () =>
  createDataKey((await deriveKeys("password", SALT, ITERATIONS)).kek);

describe("encryptor", () => {
  it("should derive stable keys that depend on password and salt", async () => {
    const { authKey } = await deriveKeys("password", SALT, ITERATIONS);

    expect(authKey).toMatch(/^[0-9a-f]{64}$/);
    expect((await deriveKeys("password", SALT, ITERATIONS)).authKey).toBe(
      authKey
    );
    expect((await deriveKeys("other", SALT, ITERATIONS)).authKey).not.toBe(
      authKey
    );
    expect(
      (await deriveKeys("password", generateSalt(), ITERATIONS)).authKey
    ).not.toBe(authKey);
  });

  it("should unwrap the data key with the same password only", async () => {
    const { wrappedKey, dataKey } = await newDataKey();
    const encrypted = await encrypt({ a: 1 }, dataKey);

    const sameKek = (await deriveKeys("password", SALT, ITERATIONS)).kek;
    const unwrapped = await unwrapDataKey(wrappedKey, sameKek);
    expect(await decrypt(encrypted, unwrapped)).toEqual({ a: 1 });
    expect(unwrapped.extractable).toBe(false);

    const otherKek = (await deriveKeys("other", SALT, ITERATIONS)).kek;
    await expect(unwrapDataKey(wrappedKey, otherKek)).rejects.toThrow();
  });

  it("should rewrap the same data key for a new password", async () => {
    const { wrappedKey, dataKey } = await newDataKey();
    const encrypted = await encrypt({ a: 1 }, dataKey);
    const oldKek = (await deriveKeys("password", SALT, ITERATIONS)).kek;
    const newSalt = generateSalt();
    const newKek = (await deriveKeys("new password", newSalt, ITERATIONS)).kek;

    const rewrapped = await rewrapDataKey(wrappedKey, oldKek, newKek);

    expect(rewrapped).not.toBe(wrappedKey);
    const unwrapped = await unwrapDataKey(rewrapped, newKek);
    expect(unwrapped.extractable).toBe(false);
    expect(await decrypt(encrypted, unwrapped)).toEqual({ a: 1 });
    await expect(unwrapDataKey(rewrapped, oldKek)).rejects.toThrow();
  });

  it("should refuse to rewrap with a wrong old password", async () => {
    const { wrappedKey } = await newDataKey();
    const wrongKek = (await deriveKeys("other", SALT, ITERATIONS)).kek;
    const newKek = (await deriveKeys("new password", SALT, ITERATIONS)).kek;

    await expect(rewrapDataKey(wrappedKey, wrongKek, newKek)).rejects.toThrow();
  });

  it("should generate recovery keys of 26 base32 characters in groups", () => {
    const key = generateRecoveryKey();

    expect(key).toMatch(/^([A-Z2-7]{4}-){6}[A-Z2-7]{2}$/);
    expect(generateRecoveryKey()).not.toBe(key);
    expect(parseRecoveryKey(key)).toHaveLength(16);
  });

  it("should parse a recovery key however it was typed", () => {
    // 16 bytes 0..15 in base32
    const key = "AAAQ-EAYE-AUDA-OCAJ-BIFQ-YDIO-B4";
    const bytes = Uint8Array.from({ length: 16 }, (_, i) => i);

    expect(parseRecoveryKey(key)).toEqual(bytes);
    expect(parseRecoveryKey(" aaaq eaye audaocaj-bifq-ydio-b4 ")).toEqual(
      bytes
    );
    // digits that look like letters of the alphabet
    expect(parseRecoveryKey("AAAQ-EAYE-AUDA-0CAJ-81FQ-YD1O-B4")).toEqual(
      bytes
    );
  });

  it.each([
    "",
    "AAAQ-EAYE-AUDA-OCAJ-BIFQ-YDIO-B",
    "AAAQ-EAYE-AUDA-OCAJ-BIFQ-YDIO-B4A",
    "AAAQ-EAYE-AUDA-OCAJ-BIFQ-YDIO-B!",
    // the unused bits of the last character are set
    "AAAQ-EAYE-AUDA-OCAJ-BIFQ-YDIO-B5",
  ])("should refuse %j as a recovery key", (key) => {
    expect(parseRecoveryKey(key)).toBeNull();
  });

  it("should unwrap the same data key with the recovery key", async () => {
    const recoveryKey = parseRecoveryKey(generateRecoveryKey())!;
    const recovery = await deriveRecoveryKeys(recoveryKey);
    const { kek } = await deriveKeys("password", SALT, ITERATIONS);
    const { wrappedKey, recoveryWrappedKey, dataKey } = await createDataKey(
      kek,
      recovery.kek
    );
    const encrypted = await encrypt({ a: 1 }, dataKey);

    expect(recovery.authKey).toMatch(/^[0-9a-f]{64}$/);
    expect((await deriveRecoveryKeys(recoveryKey)).authKey).toBe(
      recovery.authKey
    );
    expect(recoveryWrappedKey).not.toBe(wrappedKey);
    const unwrapped = await unwrapDataKey(recoveryWrappedKey!, recovery.kek);
    expect(await decrypt(encrypted, unwrapped)).toEqual({ a: 1 });

    const other = await deriveRecoveryKeys(
      parseRecoveryKey(generateRecoveryKey())!
    );
    await expect(unwrapDataKey(recoveryWrappedKey!, other.kek)).rejects.toThrow();
  });

  it("should not wrap for recovery without a recovery kek", async () => {
    expect((await newDataKey()).recoveryWrappedKey).toBeUndefined();
  });

  it.each([{ something: "here", other: "there", and: 83 }, null, {}])(
    "should encrypt and decrypt correctly",
    async (obj) => {
      const { dataKey } = await newDataKey();

      const encrypted = await encrypt(obj, dataKey);
      expect(Object.keys(JSON.parse(encrypted))).toEqual(["iv", "ct"]);
      expect(encrypted).not.toContain("here");

      expect(await decrypt(encrypted, dataKey)).toEqual(obj ?? {});
    }
  );

  it("should use a fresh iv for every encryption", async () => {
    const { dataKey } = await newDataKey();

    expect(await encrypt({ a: 1 }, dataKey)).not.toBe(
      await encrypt({ a: 1 }, dataKey)
    );
  });

  it("should reject tampered data", async () => {
    const { dataKey } = await newDataKey();
    const envelope = JSON.parse(await encrypt({ amount: 100 }, dataKey));
    const ct = atob(envelope.ct);
    envelope.ct = btoa(String.fromCharCode(ct.charCodeAt(0) ^ 1) + ct.slice(1));

    await expect(decrypt(JSON.stringify(envelope), dataKey)).rejects.toThrow();
  });

  it("should reject data encrypted with another key", async () => {
    const encrypted = await encrypt({ a: 1 }, (await newDataKey()).dataKey);

    await expect(
      decrypt(encrypted, (await newDataKey()).dataKey)
    ).rejects.toThrow();
  });

  it("should not accept a wrapped key as data", async () => {
    const { wrappedKey, dataKey } = await newDataKey();

    await expect(decrypt(wrappedKey, dataKey)).rejects.toThrow();
  });

  it("should return empty object when decrypting empty string", async () => {
    const { dataKey } = await newDataKey();

    expect(await decrypt("", dataKey)).toEqual({});
  });
});
