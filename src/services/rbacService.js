const { Op } = require('sequelize');
const models = require('../models');
const { AppError, AuthorizationError } = require('../utils/errors');

const { Permission, Role, UserRole, User, Tenant } = models;

const listPermissions = async () => Permission.findAll({ order: [['resource', 'ASC'], ['action', 'ASC']] });

const createPermission = async ({ resource, action, description }) => {
  const [permission, created] = await Permission.findOrCreate({ where: { resource, action }, defaults: { description, isSystem: false } });
  if (!created) throw new AppError('Permissão já existe', 409, 'PERMISSION_ALREADY_EXISTS');
  return permission;
};

const listRoles = async ({ tenantId = null } = {}) => Role.findAll({
  where: { [Op.or]: [{ tenantId: null }, { tenantId }] },
  include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }],
  order: [['tenantId', 'ASC'], ['name', 'ASC']],
});

const createRole = async ({ name, slug, description, tenantId = null, permissionIds = [] }) => {
  const tenant = tenantId ? await Tenant.findByPk(tenantId) : null;
  if (tenantId && !tenant) throw new AppError('Tenant não encontrado', 404, 'TENANT_NOT_FOUND');
  const role = await Role.create({ name, slug, description, tenantId, isSystem: false, isAssignable: true });
  if (permissionIds.length) await role.setPermissions(await Permission.findAll({ where: { id: permissionIds } }));
  return Role.findByPk(role.id, { include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }] });
};

const updateRole = async (roleId, payload) => {
  const role = await Role.findByPk(roleId);
  if (!role) throw new AppError('Role não encontrada', 404, 'ROLE_NOT_FOUND');
  if (role.isSystem && payload.slug && payload.slug !== role.slug) throw new AppError('Role de sistema não pode mudar de slug', 400, 'SYSTEM_ROLE_IMMUTABLE');
  await role.update({ name: payload.name ?? role.name, description: payload.description ?? role.description, isAssignable: payload.isAssignable ?? role.isAssignable });
  if (Array.isArray(payload.permissionIds)) await role.setPermissions(await Permission.findAll({ where: { id: payload.permissionIds } }));
  return Role.findByPk(roleId, { include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }] });
};

const deleteRole = async (roleId) => {
  const role = await Role.findByPk(roleId);
  if (!role) throw new AppError('Role não encontrada', 404, 'ROLE_NOT_FOUND');
  if (role.isSystem) throw new AppError('Role de sistema não pode ser removida', 400, 'SYSTEM_ROLE_IMMUTABLE');
  await role.destroy();
  return { success: true };
};

const assignRole = async ({ userId, roleId, tenantId, assignedBy }) => {
  const [user, role] = await Promise.all([User.findByPk(userId), Role.findByPk(roleId)]);
  if (!user) throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');
  if (!role) throw new AppError('Role não encontrada', 404, 'ROLE_NOT_FOUND');
  if (role.tenantId && role.tenantId !== tenantId) throw new AuthorizationError('Role não pertence ao tenant informado');
  const [assignment] = await UserRole.findOrCreate({ where: { userId, roleId, tenantId }, defaults: { assignedBy } });
  await user.increment({ tokenVersion: 1 });
  return assignment;
};

const revokeRole = async ({ userId, roleId, tenantId }) => {
  const deleted = await UserRole.destroy({ where: { userId, roleId, tenantId } });
  if (deleted) await User.increment({ tokenVersion: 1 }, { where: { id: userId } });
  return { success: true, revoked: Boolean(deleted) };
};

const evaluate = async ({ userId, tenantId, resource, action }) => {
  const assignments = await UserRole.findAll({
    where: { userId, [Op.or]: [{ tenantId: null }, { tenantId }] },
    include: [{ model: Role, as: 'role', include: [{ model: Permission, as: 'permissions', through: { attributes: [] }, where: { resource, action }, required: true }] }],
  });
  return { allowed: assignments.length > 0 };
};

module.exports = { listPermissions, createPermission, listRoles, createRole, updateRole, deleteRole, assignRole, revokeRole, evaluate };
