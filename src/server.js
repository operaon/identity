const http = require('http');
const app = require('./app');
const env = require('./config/env');
const sequelize = require('./config/database');
const logger = require('./config/logger');

const server = http.createServer(app);
let shuttingDown = false;

const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'identity shutdown started');
  server.close(async () => {
    try { await sequelize.close(); } catch (error) { logger.error({ err: error }, 'database close failed'); }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};

const start = async () => {
  await sequelize.authenticate();
  server.listen(env.port, env.host, () => logger.info({ service: env.serviceName, host: env.host, port: env.port }, 'identity started'));
};

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => shutdown(signal));
process.on('unhandledRejection', (error) => logger.error({ err: error }, 'unhandled rejection'));
process.on('uncaughtException', (error) => { logger.fatal({ err: error }, 'uncaught exception'); process.exit(1); });

if (require.main === module) start().catch((error) => { logger.fatal({ err: error }, 'identity startup failed'); process.exit(1); });

module.exports = { app, server, start, shutdown };
