import "dotenv/config";
import { promises } from "fs";
const { readFile, writeFile } = promises;

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
 * @returns {Promise<void>}
 */
async function decryptFile(key, iv, filePath) {
  const way = "decrypted";
  try {
    // The encrypted data as a hex string
    // Use the readFile method to read the data to be encrypted from a local file
    const data = (await readFile(filePath)).toString();
    const keyParsed = enc.Hex.parse(key);
    const options = { iv: enc.Hex.parse(iv), format: format.Hex };

    // Decrypt the data
    const newData = AES.decrypt(data, keyParsed, options).toString(enc.Utf8); //Utf8 is important for text

    // Use the writeFile method to write the data to a local file
    const newPath = `${filePath}-${way}`;
    await writeFile(newPath, newData);

    console.log(newData);
    console.log(
      `File ${filePath} has been ${way} successfully at ${newPath} !`
    );
  } catch (err) {
    console.error(err);
  }
}

decryptFile(key, iv, filePath);
