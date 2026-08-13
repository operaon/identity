const crypto = require('crypto');

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

const encrypt = (plaintext, key) => {
  const normalizedKey = crypto.createHash('sha256').update(String(key)).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', normalizedKey, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
};

const decrypt = (ciphertext, key) => {
  const [ivEncoded, tagEncoded, dataEncoded] = String(ciphertext).split('.');
  if (!ivEncoded || !tagEncoded || !dataEncoded) throw new Error('Ciphertext inválido');
  const normalizedKey = crypto.createHash('sha256').update(String(key)).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', normalizedKey, Buffer.from(ivEncoded, 'base64'));
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataEncoded, 'base64')),
    decipher.final(),
  ]).toString('utf8');
};

module.exports = { sha256, randomToken, encrypt, decrypt };
