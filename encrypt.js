import "dotenv/config";
import { promises } from "fs";
const { readFile, writeFile } = promises;

import CryptoJS from "crypto-js";
const { AES, enc, format } = CryptoJS;

// The key and initialization vector as hex strings
const key = process.env.CRYPTED_FILE_KEY || "010101_my_key_010101";
const iv = process.env.CRYPTED_FILE_IV || "010101_my_iv_010101";
const filePath = process.env.FILE_PATH_TO_CRYPT || "mock/file";

async function encryptFile(key, iv, filePath) {
  try {
    // Use the readFile method to read the data to be encrypted from a local file
    const data = (await readFile(filePath)).toString();

    const options = { iv: enc.Hex.parse(iv), format: format.Hex };

    // Encrypt the data
    const encryptedData = AES.encrypt(
      data.toString(),
      enc.Hex.parse(key),
      options
    ).toString();

    // Use the writeFile method to write the encrypted data to a local file
    const newPath = `${filePath}-encrypted`;
    await writeFile(newPath, encryptedData);

    console.log(`File encrypted successfully at ${newPath} !`);
  } catch (err) {
    console.error(err);
  }
}

encryptFile(key, iv, filePath);
