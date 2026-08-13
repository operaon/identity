const express = require('express');
const controller = require('../controllers/rbacController');
const { authenticate, requirePermission } = require('../middlewares/auth');
const { validate } = require('../validators');

const router = express.Router();
router.use(authenticate);
router.get('/permissions', requirePermission('rbac', 'read'), controller.permissions);
router.post('/permissions', requirePermission('rbac', 'write'), validate('permission'), controller.createPermission);
router.get('/roles', requirePermission('rbac', 'read'), controller.roles);
router.post('/roles', requirePermission('rbac', 'write'), validate('role'), controller.createRole);
router.patch('/roles/:roleId', requirePermission('rbac', 'write'), controller.updateRole);
router.delete('/roles/:roleId', requirePermission('rbac', 'write'), controller.deleteRole);
router.post('/assignments', requirePermission('rbac', 'write'), validate('assignRole'), controller.assignRole);
router.delete('/assignments', requirePermission('rbac', 'write'), controller.revokeRole);
router.get('/evaluate', controller.evaluate);

module.exports = router;
