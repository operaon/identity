'use strict';

const crypto = require('crypto');
const env = require('../config/env');
const { AuthenticationError } = require('../utils/errors');

const safeEqual = (left, right) => {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const isMtlsAuthenticated = (req) => {
  if (req.socket?.authorized === true || req.client?.authorized === true) return true;
  const headerValue = req.headers[env.communication.trustedMtlsHeader];
  return typeof headerValue === 'string' && headerValue.toUpperCase() === 'SUCCESS';
};

const authenticateService = (req, _res, next) => {
  const keyId = req.headers['x-key-id'] || env.communication.keyId;
  const serviceKey = req.headers['x-service-key'];
  const expectedKey = env.serviceApiKeys[keyId];

  if (!expectedKey || !serviceKey || !safeEqual(serviceKey, expectedKey)) {
    return next(new AuthenticationError('Service key inválida', 'INVALID_SERVICE_KEY'));
  }

  if (env.communication.requireServiceId) {
    const serviceId = req.headers['x-service-id'];
    if (typeof serviceId !== 'string' || serviceId.length < 2 || serviceId.length > 120) {
      return next(new AuthenticationError('X-Service-Id obrigatório', 'INVALID_SERVICE_ID'));
    }
  }

  if (env.communication.requireMtls && !isMtlsAuthenticated(req)) {
    return next(new AuthenticationError('Certificado mTLS obrigatório', 'MTLS_REQUIRED'));
  }

  req.isService = true;
  req.serviceKeyId = keyId;
  req.serviceId = req.headers['x-service-id'] || null;
  return next();
};

module.exports = { authenticateService, isMtlsAuthenticated };
