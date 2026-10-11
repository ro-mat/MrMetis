import {
  createDataKey,
  decrypt,
  deriveKeys,
  encrypt,
  generateSalt,
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

  it.each([{ something: "here", other: "there", and: 83 }, null, {}])(
    "should encrypt and decrypt correctly",
    async (obj: any) => {
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
