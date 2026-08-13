require('dotenv').config();

const base = {
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'dbadmin',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'operaon_identity',
  logging: false,
};

if (process.env.DATABASE_URL) {
  base.use_env_variable = 'DATABASE_URL';
  delete base.host;
  delete base.port;
  delete base.username;
  delete base.password;
  delete base.database;
}

module.exports = {
  development: base,
  test: { ...base, database: process.env.TEST_DB_NAME || 'operaon_identity_test' },
  production: { ...base },
};
