const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { Op } = require('sequelize');
const env = require('../config/env');
const models = require('../models');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { randomToken, sha256 } = require('../utils/security');
const { AuthenticationError, AppError } = require('../utils/errors');
const mfaService = require('./mfaService');
const emailService = require('./emailService');

const {
  User, Organization, Tenant, Membership, Role, Permission, UserRole,
  Session, VerificationToken, MfaChallenge,
} = models;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const userView = (user) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  status: user.status,
  emailVerified: Boolean(user.emailVerifiedAt),
  mfaEnabled: user.mfaEnabled,
  lastLoginAt: user.lastLoginAt,
});

const ensurePermission = async (resource, action, description, transaction) => {
  const [permission] = await Permission.findOrCreate({
    where: { resource, action },
    defaults: { description, isSystem: true },
    transaction,
  });
  return permission;
};

const ensureRole = async (slug, name, description, permissionNames, tenantId = null, transaction) => {
  const [role] = await Role.findOrCreate({
    where: { slug, tenantId },
    defaults: { name, description, tenantId, isSystem: true, isAssignable: true },
    transaction,
  });
  for (const permissionName of permissionNames) {
    const [resource, action] = permissionName.split(':');
    const permission = await ensurePermission(resource, action, permissionName, transaction);
    await role.addPermission(permission, { transaction });
  }
  return role;
};

const rolePermissionsForUser = async (userId, tenantId) => {
  const assignments = await UserRole.findAll({
    where: { userId, [Op.or]: [{ tenantId: null }, { tenantId }] },
    include: [{
      model: Role,
      as: 'role',
      include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }],
    }],
  });

  const roles = [];
  const permissionSet = new Set();
  for (const assignment of assignments) {
    if (!assignment.role) continue;
    roles.push({ slug: assignment.role.slug, name: assignment.role.name, tenantId: assignment.role.tenantId });
    for (const permission of assignment.role.permissions || []) permissionSet.add(`${permission.resource}:${permission.action}`);
  }
  return { roles, permissions: [...permissionSet].sort() };
};

const membershipsForUser = async (userId) => Membership.findAll({
  where: { userId, status: 'active' },
  include: [{ model: Tenant, as: 'tenant', attributes: ['id', 'name', 'slug', 'organizationId', 'status', 'isApproved', 'isActive'] }],
  order: [['isDefault', 'DESC'], ['createdAt', 'ASC']],
});

const buildAuthContext = async (userId, tenantId) => {
  const user = await User.findByPk(userId);
  if (!user) throw new AuthenticationError('Usuário não encontrado', 'USER_NOT_FOUND');
  const memberships = await membershipsForUser(userId);
  const selectedTenantId = tenantId || memberships[0]?.tenantId || null;
  const rbac = await rolePermissionsForUser(userId, selectedTenantId);
  const selectedMembership = memberships.find((membership) => membership.tenantId === selectedTenantId);
  const organizationIds = [...new Set(memberships.map((membership) => membership.tenant?.organizationId).filter(Boolean))];

  return {
    user,
    tenantId: selectedTenantId,
    organizationIds,
    roles: rbac.roles,
    permissions: rbac.permissions,
    memberships: memberships.map((membership) => ({
      tenantId: membership.tenantId,
      status: membership.status,
      isDefault: membership.isDefault,
      tenant: membership.tenant,
    })),
    membership: selectedMembership || null,
  };
};

const claimsFromContext = (context, sessionId) => ({
  sub: context.user.id,
  id: context.user.id,
  email: context.user.email,
  sessionId,
  tenantId: context.tenantId,
  organizationIds: context.organizationIds,
  roles: context.roles.map((role) => role.slug),
  permissions: context.permissions,
  tokenVersion: context.user.tokenVersion,
});

const createSessionTokens = async (context, metadata = {}, existingSession = null) => {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionId = existingSession?.id || randomUUID();
  const refreshToken = generateRefreshToken({ sub: context.user.id, sessionId, tokenVersion: context.user.tokenVersion, tenantId: context.tenantId, jti: randomUUID() });
  const session = existingSession || await Session.create({
    id: sessionId,
    userId: context.user.id,
    refreshTokenHash: sha256(refreshToken),
    userAgent: metadata.userAgent,
    ipAddress: metadata.ipAddress,
    deviceName: metadata.deviceName,
    expiresAt,
  });
  if (existingSession) {
    await session.update({ refreshTokenHash: sha256(refreshToken), expiresAt, lastUsedAt: new Date(), revokedAt: null, revokeReason: null });
  }
  const claims = claimsFromContext(context, session.id);
  return {
    accessToken: generateAccessToken(claims),
    refreshToken,
    sessionId: session.id,
    expiresAt,
  };
};

const assertLoginAllowed = async (user) => {
  if (user.status === 'blocked' || (user.lockedUntil && new Date(user.lockedUntil) > new Date())) {
    throw new AuthenticationError('Conta temporariamente bloqueada', 'ACCOUNT_LOCKED');
  }
  if (user.status === 'deleted') throw new AuthenticationError('Credenciais inválidas', 'INVALID_CREDENTIALS');
};

const register = async (payload) => {
  const email = normalizeEmail(payload.email);
  const existing = await User.findOne({ where: { email } });
  if (existing) throw new AppError('E-mail já cadastrado', 409, 'EMAIL_ALREADY_EXISTS');

  const transaction = await models.sequelize.transaction();
  try {
    const organization = await Organization.create({ name: payload.organizationName || payload.tenantName, slug: `${String(payload.tenantSlug || payload.tenantName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now()}` }, { transaction });
    const tenant = await Tenant.create({ name: payload.tenantName, slug: `${String(payload.tenantSlug || payload.tenantName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now()}`, organizationId: organization.id, status: 'active', isApproved: true, isActive: true }, { transaction });
    const user = await User.create({ email, passwordHash: await bcrypt.hash(payload.password, env.password.bcryptRounds), firstName: payload.firstName, lastName: payload.lastName, phone: payload.phone, status: 'active' }, { transaction });
    await Membership.create({ userId: user.id, tenantId: tenant.id, status: 'active', isDefault: true, joinedAt: new Date() }, { transaction });
    const role = await ensureRole('tenant_admin', 'Administrador do tenant', 'Administra usuários e recursos do tenant', ['tenant:read', 'tenant:update', 'user:read', 'user:write', 'rbac:read', 'rbac:write'], tenant.id, transaction);
    await UserRole.create({ userId: user.id, roleId: role.id, tenantId: tenant.id }, { transaction });
    await transaction.commit();
    return loginWithUser(user, { tenantId: tenant.id });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const registerProfessional = async (payload) => {
  const email = normalizeEmail(payload.email);
  const tenant = await Tenant.findByPk(payload.tenantId);
  if (!tenant || tenant.status === 'deleted') throw new AppError('Tenant não encontrado', 404, 'TENANT_NOT_FOUND');
  if (await User.findOne({ where: { email } })) throw new AppError('E-mail já cadastrado', 409, 'EMAIL_ALREADY_EXISTS');
  const user = await User.create({ email, passwordHash: await bcrypt.hash(payload.password, env.password.bcryptRounds), firstName: payload.firstName, lastName: payload.lastName, phone: payload.phone, status: 'active' });
  await Membership.create({ userId: user.id, tenantId: tenant.id, status: 'active', isDefault: true, joinedAt: new Date() });
  const role = await ensureRole('professional', 'Profissional', 'Profissional do tenant', ['patient:read', 'clinical:read', 'clinical:write'], tenant.id);
  await UserRole.create({ userId: user.id, roleId: role.id, tenantId: tenant.id });
  return loginWithUser(user, { tenantId: tenant.id });
};

const registerPatient = async (payload) => {
  const email = normalizeEmail(payload.email);
  if (await User.findOne({ where: { email } })) throw new AppError('E-mail já cadastrado', 409, 'EMAIL_ALREADY_EXISTS');
  const user = await User.create({ email, passwordHash: await bcrypt.hash(payload.password, env.password.bcryptRounds), firstName: payload.firstName, lastName: payload.lastName, phone: payload.phone, status: 'active' });
  if (payload.tenantId) {
    const tenant = await Tenant.findByPk(payload.tenantId);
    if (!tenant) throw new AppError('Tenant não encontrado', 404, 'TENANT_NOT_FOUND');
    await Membership.create({ userId: user.id, tenantId: tenant.id, status: 'active', isDefault: true, joinedAt: new Date() });
    const role = await ensureRole('patient', 'Paciente', 'Paciente do tenant', ['patient:read', 'patient:write'], tenant.id);
    await UserRole.create({ userId: user.id, roleId: role.id, tenantId: tenant.id });
  }
  return loginWithUser(user, { tenantId: payload.tenantId });
};

const loginWithUser = async (user, metadata = {}) => {
  const context = await buildAuthContext(user.id, metadata.tenantId);
  const tokens = await createSessionTokens(context, metadata);
  await user.update({ lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null });
  return { user: userView(user), ...tokens, tenantId: context.tenantId, roles: context.roles, permissions: context.permissions };
};

const login = async (payload, metadata = {}) => {
  const user = await User.findOne({ where: { email: normalizeEmail(payload.email) } });
  if (!user || !user.passwordHash) throw new AuthenticationError('Credenciais inválidas', 'INVALID_CREDENTIALS');
  await assertLoginAllowed(user);
  const valid = await bcrypt.compare(payload.password, user.passwordHash);
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    await user.update({ failedLoginAttempts: attempts, lockedUntil: attempts >= env.password.maxFailedAttempts ? new Date(Date.now() + env.password.lockMinutes * 60000) : null });
    throw new AuthenticationError('Credenciais inválidas', 'INVALID_CREDENTIALS');
  }
  if (user.mfaEnabled) {
    const challenge = randomToken(32);
    await MfaChallenge.create({ userId: user.id, tokenHash: sha256(challenge), ipAddress: metadata.ipAddress, userAgent: metadata.userAgent, expiresAt: new Date(Date.now() + 5 * 60000) });
    return { mfaRequired: true, mfaToken: challenge, user: userView(user) };
  }
  return loginWithUser(user, metadata);
};

const verifyMfaLogin = async (mfaToken, code, metadata = {}) => {
  const challenge = await MfaChallenge.findOne({ where: { tokenHash: sha256(mfaToken), consumedAt: null, expiresAt: { [Op.gt]: new Date() } } });
  if (!challenge) throw new AuthenticationError('Desafio MFA inválido ou expirado', 'MFA_CHALLENGE_INVALID');
  const user = await User.findByPk(challenge.userId);
  if (!user) throw new AuthenticationError('Usuário não encontrado', 'USER_NOT_FOUND');
  await mfaService.verifyCode(user, code);
  await challenge.update({ consumedAt: new Date() });
  return loginWithUser(user, metadata);
};

const refresh = async (refreshToken) => {
  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) throw new AuthenticationError('Refresh token inválido ou expirado', 'INVALID_REFRESH_TOKEN');
  const session = await Session.findOne({ where: { id: decoded.sessionId, refreshTokenHash: sha256(refreshToken), revokedAt: null, expiresAt: { [Op.gt]: new Date() } } });
  if (!session) throw new AuthenticationError('Sessão inválida ou revogada', 'SESSION_REVOKED');
  const user = await User.findByPk(decoded.sub);
  if (!user || user.tokenVersion !== decoded.tokenVersion) throw new AuthenticationError('Sessão inválida', 'SESSION_INVALID');
  const context = await buildAuthContext(user.id, decoded.tenantId);
  return { user: userView(user), ...(await createSessionTokens(context, { userAgent: session.userAgent, ipAddress: session.ipAddress }, session)), tenantId: context.tenantId, roles: context.roles, permissions: context.permissions };
};

const logout = async (userId, sessionId) => {
  await Session.update({ revokedAt: new Date(), revokeReason: 'logout' }, { where: { id: sessionId, userId, revokedAt: null } });
  return { success: true };
};

const logoutAll = async (userId) => {
  await Session.update({ revokedAt: new Date(), revokeReason: 'logout_all' }, { where: { userId, revokedAt: null } });
  await User.increment({ tokenVersion: 1 }, { where: { id: userId } });
  return { success: true };
};

const requestPasswordReset = async (email) => {
  const user = await User.findOne({ where: { email: normalizeEmail(email) } });
  if (!user) return { success: true };
  const rawToken = randomToken(32);
  await VerificationToken.create({ userId: user.id, type: 'password_reset', tokenHash: sha256(rawToken), expiresAt: new Date(Date.now() + 30 * 60000) });
  await emailService.sendPasswordReset(user, rawToken);
  return { success: true, ...(env.isProduction ? {} : { debugToken: rawToken }) };
};

const resetPassword = async (token, password) => {
  const verification = await VerificationToken.findOne({ where: { type: 'password_reset', tokenHash: sha256(token), consumedAt: null, expiresAt: { [Op.gt]: new Date() } } });
  if (!verification) throw new AppError('Token inválido ou expirado', 400, 'RESET_TOKEN_INVALID');
  const user = await User.findByPk(verification.userId);
  await user.update({ passwordHash: await bcrypt.hash(password, env.password.bcryptRounds), tokenVersion: user.tokenVersion + 1, failedLoginAttempts: 0, lockedUntil: null });
  await verification.update({ consumedAt: new Date() });
  await Session.update({ revokedAt: new Date(), revokeReason: 'password_reset' }, { where: { userId: user.id, revokedAt: null } });
  return { success: true };
};

const verifyEmail = async (userId, token) => {
  const verification = await VerificationToken.findOne({ where: { userId, type: 'email_verification', tokenHash: sha256(token), consumedAt: null, expiresAt: { [Op.gt]: new Date() } } });
  if (!verification) throw new AppError('Código de verificação inválido ou expirado', 400, 'EMAIL_TOKEN_INVALID');
  const user = await User.findByPk(userId);
  await user.update({ emailVerifiedAt: new Date(), status: user.status === 'pending' ? 'active' : user.status });
  await verification.update({ consumedAt: new Date() });
  return { success: true };
};

const resendVerification = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');
  const rawToken = randomToken(24);
  await VerificationToken.create({ userId, type: 'email_verification', tokenHash: sha256(rawToken), expiresAt: new Date(Date.now() + 24 * 60 * 60000) });
  await emailService.sendEmailVerification(user, rawToken);
  return { success: true, ...(env.isProduction ? {} : { debugToken: rawToken }) };
};

const getProfile = async (userId, tenantId) => {
  const context = await buildAuthContext(userId, tenantId);
  return { user: userView(context.user), tenantId: context.tenantId, organizationIds: context.organizationIds, memberships: context.memberships, roles: context.roles, permissions: context.permissions };
};

const switchTenant = async (userId, tenantId, metadata = {}) => {
  const context = await buildAuthContext(userId, tenantId);
  if (!context.membership || context.membership.status !== 'active') throw new AppError('Usuário não possui acesso ao tenant', 403, 'TENANT_ACCESS_DENIED');
  return { user: userView(context.user), ...(await createSessionTokens(context, metadata)), tenantId: context.tenantId, roles: context.roles, permissions: context.permissions };
};

const issueServiceToken = async ({ userId, tenantId, audience, permissions = [] }) => {
  const requestedAudience = Array.isArray(audience) ? audience : (audience ? [audience] : env.jwt.serviceAudiences);
  const audienceIsAllowed = requestedAudience.length > 0
    && requestedAudience.every((item) => env.jwt.serviceAudiences.includes(item));
  if (!audienceIsAllowed) {
    throw new AuthenticationError('Audience de serviço não autorizada', 'SERVICE_AUDIENCE_NOT_ALLOWED');
  }

  const normalizedPermissions = Array.isArray(permissions)
    ? permissions.filter((permission) => typeof permission === 'string' && permission.length <= 160).slice(0, 200)
    : [];
  const claims = {
    sub: userId || 'operaon-service',
    id: userId || 'operaon-service',
    tenantId: tenantId || null,
    roles: ['service'],
    permissions: normalizedPermissions,
    organizationIds: [],
    tokenVersion: 0,
    service: true,
  };
  return {
    accessToken: generateAccessToken(claims, { audience: requestedAudience }),
    expiresIn: env.jwt.accessTtl,
    audience: requestedAudience,
  };
};

module.exports = { register, registerProfessional, registerPatient, login, verifyMfaLogin, refresh, logout, logoutAll, requestPasswordReset, resetPassword, verifyEmail, resendVerification, getProfile, switchTenant, issueServiceToken, buildAuthContext, userView };
