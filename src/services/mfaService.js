const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { Op } = require('sequelize');
const env = require('../config/env');
const { User, MfaBackupCode } = require('../models');
const { encrypt, decrypt, sha256 } = require('../utils/security');
const { AppError, AuthenticationError } = require('../utils/errors');

const generateBackupCodes = () => Array.from({ length: 10 }, () => `${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase());

const generateSetup = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');
  const secret = speakeasy.generateSecret({ name: `${env.serviceName}:${user.email}`, issuer: 'Operaon Identity' });
  await user.update({ mfaSecretEncrypted: encrypt(secret.base32, env.mfaEncryptionKey) });
  return { otpauthUrl: secret.otpauth_url, qrCode: await QRCode.toDataURL(secret.otpauth_url), message: 'Confirme com um código TOTP para ativar o MFA' };
};

const enable = async (userId, code) => {
  const user = await User.findByPk(userId);
  if (!user?.mfaSecretEncrypted) throw new AppError('Gere o segredo MFA antes de ativar', 400, 'MFA_SETUP_REQUIRED');
  const secret = decrypt(user.mfaSecretEncrypted, env.mfaEncryptionKey);
  if (!speakeasy.totp.verify({ secret, encoding: 'base32', token: String(code), window: 1 })) throw new AuthenticationError('Código MFA inválido', 'MFA_CODE_INVALID');
  const codes = generateBackupCodes();
  await MfaBackupCode.destroy({ where: { userId } });
  await MfaBackupCode.bulkCreate(codes.map((value) => ({ userId, codeHash: sha256(value) })));
  await user.update({ mfaEnabled: true });
  return { enabled: true, backupCodes: codes };
};

const disable = async (userId, code) => {
  await verifyCode(await User.findByPk(userId), code);
  const user = await User.findByPk(userId);
  await user.update({ mfaEnabled: false, mfaSecretEncrypted: null });
  await MfaBackupCode.destroy({ where: { userId } });
  return { enabled: false };
};

const verifyCode = async (user, code) => {
  if (!user?.mfaEnabled || !user.mfaSecretEncrypted) throw new AuthenticationError('MFA não está ativo', 'MFA_NOT_ENABLED');
  const value = String(code || '').trim().toUpperCase();
  const secret = decrypt(user.mfaSecretEncrypted, env.mfaEncryptionKey);
  const validTotp = /^\d{6}$/.test(value) && speakeasy.totp.verify({ secret, encoding: 'base32', token: value, window: 1 });
  if (validTotp) return true;
  const backup = await MfaBackupCode.findOne({ where: { userId: user.id, codeHash: sha256(value), usedAt: null } });
  if (backup) {
    await backup.update({ usedAt: new Date() });
    return true;
  }
  throw new AuthenticationError('Código MFA inválido', 'MFA_CODE_INVALID');
};

const regenerateBackupCodes = async (userId, code) => {
  const user = await User.findByPk(userId);
  await verifyCode(user, code);
  const codes = generateBackupCodes();
  await MfaBackupCode.destroy({ where: { userId } });
  await MfaBackupCode.bulkCreate(codes.map((value) => ({ userId, codeHash: sha256(value) })));
  return { backupCodes: codes };
};

const status = async (userId) => {
  const user = await User.findByPk(userId, { attributes: ['mfaEnabled'] });
  return { enabled: Boolean(user?.mfaEnabled) };
};

module.exports = { generateSetup, enable, disable, verifyCode, regenerateBackupCodes, status };
