const crypto = require("crypto");

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default_secret_key_123";
const SALT = "blockchain_salt";

// Generate 32-byte key
const KEY = crypto.scryptSync(ENCRYPTION_KEY, SALT, 32);

exports.encrypt = (buffer) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(buffer),
    cipher.final()
  ]);

  return Buffer.concat([iv, encrypted]);
};

exports.decrypt = (buffer) => {
  const iv = buffer.slice(0, 16);
  const encryptedText = buffer.slice(16);

  const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, iv);

  return Buffer.concat([
    decipher.update(encryptedText),
    decipher.final()
  ]);
};