import CryptoJS from "crypto-js";
import { config } from "../config";

// NOTE: ciphertext format changed from a bare base64 string to
// "<ivHex>:<cipherBase64>". A random IV is now generated per encryption
// instead of being derived from the key, which was deterministic and leaked
// plaintext patterns (identical input always produced identical output).
// IMPORTANT: any values encrypted with the OLD version of this file cannot
// be decrypted by this new version — they used a fixed, key-derived IV with
// no IV stored alongside the ciphertext. Existing encrypted DB fields need a
// migration (decrypt with the old logic, re-encrypt with this one) before
// this change is deployed, or decryptData needs a fallback path for old data.

// Encrypt function
export function encryptData(plainText: any, cid: any = config.CRYPTO_SECRET_KEY.SECRET_KEY): string {
  const rawKey = cid + cid;
  const key = CryptoJS.enc.Utf8.parse(rawKey.slice(0, 32));
  const iv = CryptoJS.lib.WordArray.random(16); // random IV per call
  const encrypted = CryptoJS.AES.encrypt(plainText, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return `${iv.toString(CryptoJS.enc.Hex)}:${encrypted.toString()}`;
}

// Decrypt function
export function decryptData(cipherText: any, cid: any = config.CRYPTO_SECRET_KEY.SECRET_KEY): string {
  const rawKey = cid + cid;
  const key = CryptoJS.enc.Utf8.parse(rawKey.slice(0, 32));

  const [ivHex, cipherBase64] = String(cipherText).split(":");
  if (!ivHex || !cipherBase64) {
    throw new Error("decryptData: malformed ciphertext (expected '<ivHex>:<cipherBase64>')");
  }
  const iv = CryptoJS.enc.Hex.parse(ivHex);

  const decrypted = CryptoJS.AES.decrypt(cipherBase64, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}


export function encryptDataname(first_name: any,last_name: any, cid:any = config.CRYPTO_SECRET_KEY.SECRET_KEY,message:any=""): string {
  const encrypted_name = decryptData(first_name,cid) + " " + decryptData(last_name,cid)
  return encryptData(message+""+encrypted_name,cid)
}



