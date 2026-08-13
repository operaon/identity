const express = require('express');
const authRoutes = require('./auth');
const rbacRoutes = require('./rbac');

const router = express.Router();
router.use('/auth', authRoutes);
router.use('/rbac', rbacRoutes);

module.exports = router;
