const { verifyAccessToken } = require('../utils/jwt');
const { User } = require('../models');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');

const authenticate = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw new AuthenticationError();
    const claims = verifyAccessToken(token);
    if (!claims) throw new AuthenticationError('Token inválido ou expirado', 'INVALID_ACCESS_TOKEN');
    const user = await User.findByPk(claims.sub);
    if (!user || user.status !== 'active' || user.tokenVersion !== claims.tokenVersion) throw new AuthenticationError('Sessão inválida', 'SESSION_INVALID');
    req.auth = claims;
    req.user = { id: user.id, email: user.email, status: user.status };
    req.tenantId = claims.tenantId || req.headers['x-tenant-id'] || null;
    next();
  } catch (error) { next(error); }
};

const requirePermission = (resource, action) => (req, _res, next) => {
  const permissions = req.auth?.permissions || [];
  if (permissions.includes(`${resource}:${action}`) || permissions.includes('*:*')) return next();
  return next(new AuthorizationError(`Permissão necessária: ${resource}:${action}`));
};

module.exports = { authenticate, requirePermission };
