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
  serviceApiKey: requiredInProduction('SERVICE_API_KEY', process.env.IDENTITY_SERVICE_API_KEY || (isTest ? 'identity-test-service-key' : 'identity-development-service-key')),
  jwt: {
    algorithm: jwtAlgorithm,
    secret: jwtSecret,
    privateKey: normalizeKey(process.env.JWT_PRIVATE_KEY),
    publicKey: normalizeKey(process.env.JWT_PUBLIC_KEY),
    issuer: process.env.JWT_ISSUER || 'operaon-identity',
    audience: parseList(process.env.JWT_AUDIENCE, ['operaon-api']),
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
