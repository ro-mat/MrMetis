import { decrypt, encrypt, hashPassword } from "services/encryptor";

type EncryptObject = { something: string; other: string; and: number };

const vaultKey =
  "31ba961031e636c42ffa023bde2f79d7b196b8774889832b9055e9fdec6671b83e04fd97363fd699d544ebf19348373753c320f45f2770e8714e579d5a1a746d";

describe("encryptor", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    jest.restoreAllMocks();
  });

  it("should hash properly", async () => {
    const setStorageItemSpy = jest.spyOn(
      Object.getPrototypeOf(window.sessionStorage),
      "setItem"
    );

    const hash = await hashPassword("test", "test");

    expect(hash).toMatch(
      "cc0c5aa815c29ec1ccedd2f924e661273b1229d17bc41580b389f6152a5093c30228e629d5b2080ae5290353fe091003f77208e358fb98b8633616de8f7a92bd"
    );
    expect(setStorageItemSpy).toHaveBeenCalledWith("vk", vaultKey);
  });

  it.each([{ something: "here", other: "there", and: 83 }, null, {}])(
    "should encrypt and decrypt correctly",
    (obj: any) => {
      const getSessionItemSpy = jest.spyOn(
        Object.getPrototypeOf(window.sessionStorage),
        "getItem"
      );
      getSessionItemSpy.mockReturnValue(vaultKey);

      const encryptedString = encrypt(obj);
      expect(encryptedString).toMatch(/.*\S.*/); // not empty

      const decryptedObject = decrypt<any>(encryptedString);
      expect(decryptedObject).toMatchObject(obj ?? {});

      expect(getSessionItemSpy).toHaveBeenCalledWith("vk");
      expect(getSessionItemSpy).toHaveBeenCalledTimes(2);
    }
  );

  it("should return empty object when decrypting empty string", () => {
    const getSessionItemSpy = jest.spyOn(
      Object.getPrototypeOf(window.sessionStorage),
      "getItem"
    );

    const decryptedObject = decrypt<object>("");
    expect(decryptedObject).toMatchObject({});
    expect(getSessionItemSpy).toHaveBeenCalledTimes(0);
  });
});
