const rbacService = require('../services/rbacService');

const permissions = async (_req, res) => res.json({ success: true, data: await rbacService.listPermissions() });
const createPermission = async (req, res) => res.status(201).json({ success: true, data: await rbacService.createPermission(req.body) });
const roles = async (req, res) => res.json({ success: true, data: await rbacService.listRoles({ tenantId: req.query.tenantId || req.tenantId }) });
const createRole = async (req, res) => res.status(201).json({ success: true, data: await rbacService.createRole({ ...req.body, tenantId: req.body.tenantId ?? req.tenantId }) });
const updateRole = async (req, res) => res.json({ success: true, data: await rbacService.updateRole(req.params.roleId, req.body) });
const deleteRole = async (req, res) => res.json({ success: true, data: await rbacService.deleteRole(req.params.roleId) });
const assignRole = async (req, res) => res.status(201).json({ success: true, data: await rbacService.assignRole({ ...req.body, tenantId: req.body.tenantId ?? req.tenantId, assignedBy: req.user.id }) });
const revokeRole = async (req, res) => res.json({ success: true, data: await rbacService.revokeRole({ ...req.body, tenantId: req.body.tenantId ?? req.tenantId }) });
const evaluate = async (req, res) => res.json({ success: true, data: await rbacService.evaluate({ userId: req.user.id, tenantId: req.query.tenantId || req.tenantId, resource: req.query.resource, action: req.query.action }) });

module.exports = { permissions, createPermission, roles, createRole, updateRole, deleteRole, assignRole, revokeRole, evaluate };
