import CryptoJs from "crypto-js";

const hashPassword = async (
  email: string | undefined,
  pass: string | undefined
) => {
  const vaultKey = CryptoJs.PBKDF2(`${email}${pass}`, `${email}`, {
    keySize: 512 / 32,
    iterations: 5000,
  }).toString();
  sessionStorage.setItem("vk", vaultKey);

  const hash = CryptoJs.PBKDF2(`${vaultKey}${pass}`, `${email}`, {
    keySize: 512 / 32,
    iterations: 5000,
  }).toString();
  return hash;
};

const encrypt = (obj: any): string => {
  const data = { ...obj };

  const key = sessionStorage.getItem("vk");
  const jsonString = JSON.stringify(data);
  const cipher = CryptoJs.AES.encrypt(jsonString, key || "");

  return cipher.toString();
};

const encryptArray = async (arr: any[]) => {
  const res: string[] = [];
  arr.forEach(async (item) => {
    res.push(await encrypt(item));
  });
  return res;
};

const decrypt = <T>(obj: any): T => {
  if (!obj.data) {
    return {} as T;
  }

  const key = sessionStorage.getItem("vk");
  const decipher = CryptoJs.AES.decrypt(obj.data, key || "");
  const jsonString = decipher.toString(CryptoJs.enc.Utf8);
  const parsedData = JSON.parse(jsonString);
  return parsedData as T;
};

const decryptArray = async <T>(arr: string[]) => {
  const res: T[] = [];
  arr.forEach(async (item) => {
    res.push(await decrypt<T>(item));
  });
  return res;
};

const clearKeys = () => {
  sessionStorage.removeItem("vk");
};

export {
  hashPassword,
  encrypt,
  encryptArray,
  decrypt,
  decryptArray,
  clearKeys,
};
