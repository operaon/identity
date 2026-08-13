const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const routes = require('./routes');
const { requestContext, errorHandler } = require('./middlewares/operational');
const { toErrorResponse } = require('./utils/errors');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(requestContext);
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'identity', timestamp: new Date().toISOString() }));
app.get('/ready', async (_req, res, next) => {
  try {
    const { sequelize } = require('./models');
    await sequelize.authenticate();
    res.json({ status: 'ready', service: 'identity' });
  } catch (error) { next(error); }
});
app.use('/api', routes);
app.use((_req, res) => res.status(404).json({ ...toErrorResponse(Object.assign(new Error('Rota não encontrada'), { statusCode: 404, code: 'NOT_FOUND' })) }));
app.use(errorHandler);

module.exports = app;
