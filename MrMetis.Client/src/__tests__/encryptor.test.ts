import { decrypt, encrypt, hashPassword } from "services/encryptor";

const vaultKey =
  "f5205c56f121fb89c3397411b92e0c5b1749d7e872c9e6cecbccbe53b7cbe99c762683cef95c8f3f22e04f3546a4714725693dbd475cabb9fa79133b2726da3a";

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
      "084d43f713452a720059994b9d6d0a79c6a5a01b639bc291bc9c311a1cf62d6196bc77c9d3153d3d128f3808827d8c2931c877ab1bb9c67cbd88e77bf5fc4694"
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
