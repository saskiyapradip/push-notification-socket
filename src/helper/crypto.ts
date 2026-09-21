import CryptoJS from "crypto-js";
import { config } from "../config";

// Encrypt function
export function encryptData(plainText: any, cid:any = config.CRYPTO_SECRET_KEY.SECRET_KEY): string {
  const rawKey = cid+cid
const key = CryptoJS.enc.Utf8.parse(rawKey.slice(0, 32));
const iv = CryptoJS.enc.Utf8.parse(rawKey.slice(0, 16));
  const encrypted = CryptoJS.AES.encrypt(plainText, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return encrypted.toString(); 
}

// Decrypt function
export function decryptData(cipherText: any, cid:any = config.CRYPTO_SECRET_KEY.SECRET_KEY): string {
  const rawKey =cid+cid
const key = CryptoJS.enc.Utf8.parse(rawKey.slice(0, 32));
const iv = CryptoJS.enc.Utf8.parse(rawKey.slice(0, 16));
  const decrypted = CryptoJS.AES.decrypt(cipherText, key, {
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



