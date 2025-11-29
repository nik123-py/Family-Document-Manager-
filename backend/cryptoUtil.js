// backend/cryptoUtil.js
// Simple symmetric encryption for selected fields using AES-256-GCM.
// IMPORTANT: For real security, set FDM_ENCRYPTION_KEY in your environment to a
// strong random 32-byte (base64 or hex) value and keep it secret.
// If no env var is set, a hard-coded dev key is used (less secure).

const crypto = require('crypto');

const RAW_KEY = process.env.FDM_ENCRYPTION_KEY || 'dev-only-insecure-key-change-this-32bytes!';
const KEY = crypto.createHash('sha256').update(RAW_KEY).digest(); // 32 bytes

function encrypt(plainText) {
  if (!plainText) return plainText;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, enc]).toString('base64');
  return payload;
}

function decrypt(cipherText) {
  if (!cipherText) return cipherText;
  try {
    const buf = Buffer.from(cipherText, 'base64');
    if (buf.length < 12 + 16) return cipherText; // probably not encrypted
    const iv = buf.slice(0, 12);
    const tag = buf.slice(12, 28);
    const enc = buf.slice(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
    return dec;
  } catch (err) {
    // If decryption fails, assume it's plain (for backward compatibility)
    return cipherText;
  }
}

module.exports = { encrypt, decrypt };
