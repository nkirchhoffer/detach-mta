import "dotenv/config";
import { promises } from "fs";
import { createDecipheriv } from "crypto";

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
  const encryptedBuffer = await promises.readFile(filePath);

  // Create a decipher object
  const decipher = createDecipheriv(
    "aes-256-ctr",
    Buffer.from(key, "hex"),
    Buffer.from(iv, "hex")
  );

  // Decrypt the data
  let decrypted = decipher.update(
    Buffer.from(encryptedBuffer, "hex"),
    "hex",
    "utf8"
  );
  return (decrypted += decipher.final("utf8"));
}

const res = await decrypt(key, iv, filePath);
console.log(res);
