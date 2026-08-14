require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

const requiredInProduction = (name, fallback) => {
  const value = process.env[name] || fallback;
  if (isProduction && !value) {
    throw new Error(`${name} é obrigatório em produção`);
  }
  return value;
};

const parseList = (value, fallback = []) => {
  if (!value) return fallback;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
};

const host = process.env.HOST || process.env.IDENTITY_HOST || '0.0.0.0';
const port = Number(process.env.PORT || process.env.IDENTITY_PORT || 4700);
if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  throw new Error('PORT inválida');
}

const jwtAlgorithm = process.env.JWT_ALGORITHM || 'HS256';
if (!['HS256', 'RS256', 'EdDSA'].includes(jwtAlgorithm)) {
  throw new Error('JWT_ALGORITHM deve ser HS256, RS256 ou EdDSA');
}

const jwtSecret = requiredInProduction('JWT_SECRET', isTest ? 'identity-test-secret-change-me' : 'identity-development-secret-change-me');
const parseServiceKeys = () => {
  const configured = process.env.SERVICE_API_KEYS || '';
  const entries = configured.split(',').map((entry) => entry.trim()).filter(Boolean);
  const keys = {};
  for (const entry of entries) {
    const separator = entry.indexOf(':');
    if (separator <= 0 || separator === entry.length - 1) {
      throw new Error('SERVICE_API_KEYS deve usar o formato keyId:secret,keyIdAnterior:secret');
    }
    keys[entry.slice(0, separator)] = entry.slice(separator + 1);
  }
  if (Object.keys(keys).length === 0) {
    keys[process.env.COMMUNICATION_KEY_ID || 'service-key-v1'] = requiredInProduction(
      'SERVICE_API_KEY',
      isTest ? 'identity-test-service-key' : 'identity-development-service-key',
    );
  }
  return keys;
};
const serviceApiKeys = parseServiceKeys();
if (jwtAlgorithm === 'HS256' && isProduction && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET precisa ter pelo menos 32 caracteres em produção');
}

const normalizeKey = (value) => (value ? value.replace(/\\n/g, '\n') : undefined);

module.exports = {
  nodeEnv,
  isProduction,
  isTest,
  host,
  port,
  trustProxyHops: Number(process.env.TRUST_PROXY_HOPS || 1),
  serviceName: process.env.SERVICE_NAME || 'operaon_identity',
  serviceApiKey: serviceApiKeys[process.env.COMMUNICATION_KEY_ID || 'service-key-v1'],
  serviceApiKeys,
  communication: {
    keyId: process.env.COMMUNICATION_KEY_ID || 'service-key-v1',
    protocolVersion: process.env.COMMUNICATION_PROTOCOL_VERSION || '1',
    requireServiceId: process.env.REQUIRE_SERVICE_IDENTITY_HEADERS === 'true' || isProduction,
    requireMtls: process.env.REQUIRE_MTLS === 'true' || isProduction,
    trustedMtlsHeader: process.env.TRUSTED_MTLS_HEADER || 'x-ssl-client-verify',
  },
  jwt: {
    algorithm: jwtAlgorithm,
    secret: jwtSecret,
    privateKey: normalizeKey(process.env.JWT_PRIVATE_KEY),
    publicKey: normalizeKey(process.env.JWT_PUBLIC_KEY),
    issuer: process.env.JWT_ISSUER || 'operaon-identity',
    audience: parseList(process.env.JWT_AUDIENCE, ['operaon-api']),
    serviceAudiences: parseList(process.env.JWT_SERVICE_AUDIENCES, ['operaon-api', 'operaon-catalog', 'operaon-faturament', 'operaon-pay', 'operaon-agend', 'operaon-chat']),
    accessTtl: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshTtl: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  database: {
    url: process.env.DATABASE_URL,
    name: process.env.DB_NAME || 'velyon_identity',
    user: process.env.DB_USER || 'dbadmin',
    password: process.env.DB_PASSWORD || 'SenhaForte2026',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    dialect: 'postgres',
    ssl: process.env.DB_SSL === 'true',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || (isProduction ? '' : '*'),
  },
  password: {
    bcryptRounds: Number(process.env.BCRYPT_ROUNDS || (isProduction ? 12 : 4)),
    maxFailedAttempts: Number(process.env.MAX_LOGIN_ATTEMPTS || 5),
    lockMinutes: Number(process.env.LOGIN_LOCK_MINUTES || 15),
  },
  mfaEncryptionKey: process.env.MFA_ENCRYPTION_KEY || (isTest ? 'identity-test-mfa-key-change-me-32' : 'identity-development-mfa-key-change-me-32'),
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.EMAIL_FROM || 'no-reply@operaon.local',
  },
};
