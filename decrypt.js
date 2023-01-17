import "dotenv/config";
import { promises } from "fs";
const { readFile } = promises;

import CryptoJS from "crypto-js";
const { AES, enc, format } = CryptoJS;

// The key and initialization vector as hex strings
const key = process.env.CRYPTED_FILE_KEY || "010101_my_key_010101";
const iv = process.env.CRYPTED_FILE_IV || "010101_my_iv_010101";
const filePath = process.env.FILE_PATH_TO_DECRYPT || "mock/file-encrypted";

/**
 * To decrypt a file using the ES-256-CTR algorithm
 * @param {string} key
 * @param {string} iv
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function decrypt(key, iv, filePath) {
  try {
      // The encrypted data as a hex string
    const encryptedData = (await readFile(filePath)).toString();

    //const options = { iv: enc.Hex.parse(iv), format: format.Hex };

    // Decrypt the data
    const decrypted = AES.decrypt(
      enc.Hex.parse(encryptedData),
      enc.Hex.parse(key),
      //options
    );

    console.log(`File decrypted successfully from ${filePath} !`);
    return decrypted.toString(enc.Utf8);
  } catch (err) {
    console.error(err);
  }
}

const res = await decrypt(key, iv, filePath);
console.log(res);
