const env = require('../config/env');
const { AuthenticationError } = require('../utils/errors');

const authenticateService = (req, _res, next) => {
  const serviceKey = req.headers['x-service-key'];
  if (!env.serviceApiKey || serviceKey !== env.serviceApiKey) return next(new AuthenticationError('Service key inválida', 'INVALID_SERVICE_KEY'));
  req.isService = true;
  next();
};

module.exports = { authenticateService };
