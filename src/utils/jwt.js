const jwt = require('jsonwebtoken');
const env = require('../config/env');

const signingKey = () => {
  if (env.jwt.algorithm === 'HS256') return env.jwt.secret;
  if (!env.jwt.privateKey) throw new Error('JWT_PRIVATE_KEY não configurada');
  return env.jwt.privateKey;
};

const verificationKey = () => {
  if (env.jwt.algorithm === 'HS256') return env.jwt.secret;
  if (!env.jwt.publicKey) throw new Error('JWT_PUBLIC_KEY não configurada');
  return env.jwt.publicKey;
};

const sign = (payload, expiresIn) => jwt.sign(payload, signingKey(), {
  algorithm: env.jwt.algorithm,
  issuer: env.jwt.issuer,
  audience: env.jwt.audience,
  expiresIn,
});

const verify = (token, options = {}) => {
  try {
    return jwt.verify(token, verificationKey(), {
      algorithms: [env.jwt.algorithm],
      issuer: env.jwt.issuer,
      audience: env.jwt.audience,
      ...options,
    });
  } catch (_) {
    return null;
  }
};

const generateAccessToken = (claims) => sign({ ...claims, tokenType: 'access' }, env.jwt.accessTtl);
const generateRefreshToken = (claims) => sign({ ...claims, tokenType: 'refresh' }, env.jwt.refreshTtl);

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken: (token) => {
    const decoded = verify(token);
    return decoded?.tokenType === 'access' ? decoded : null;
  },
  verifyRefreshToken: (token) => {
    const decoded = verify(token);
    return decoded?.tokenType === 'refresh' ? decoded : null;
  },
};
