import "dotenv/config";
import { readFile } from "fs";
import { promisify } from "util";

import CryptoJS from "crypto-js";
const { AES, enc } = CryptoJS;

// The key and initialization vector as hex strings
const key = process.env.CRYPTED_FILE_KEY || "010101_my_key_010101";
const iv = process.env.CRYPTED_FILE_IV || "010101_my_iv_010101";
const filePath = process.env.CRYPTED_FILE_PATH || "010101_path_to_file_010101";

/**
 * To decrypt a file using the ES-256-CTR algorithm
 * @param {string} key
 * @param {string} iv
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function decrypt(key, iv, filePath) {
  // The encrypted data as a hex string
  const readFileP = promisify(readFile);

  // Decrypt the data
  readFileP(filePath)
    .then((data) => {
      const encryptedData = data.toString();
      // Decrypt the data
      const decrypted = AES.decrypt(
        enc.Hex.parse(encryptedData),
        enc.Hex.parse(key),
        { iv: enc.Hex.parse(iv) }
      ).toString(enc.Utf8);
      console.log(decrypted);
    })
    .catch((err) => {
      console.log(err);
    });
}

const res = await decrypt(key, iv, filePath);
console.log(res);
