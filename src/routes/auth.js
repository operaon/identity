'use strict';

const express = require('express');
const controller = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const { authenticateService } = require('../middlewares/serviceAuth');
const { validate } = require('../validators');
const { authRateLimiter } = require('../middlewares/operational');

const router = express.Router();
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.post('/register', authRateLimiter, validate('register'), asyncRoute(controller.register));
router.post('/register-professional', authRateLimiter, validate('professionalRegister'), asyncRoute(controller.registerProfessional));
router.post('/register-patient', authRateLimiter, validate('patientRegister'), asyncRoute(controller.registerPatient));
router.post('/login', authRateLimiter, validate('login'), asyncRoute(controller.login));
router.post('/mfa/verify', authRateLimiter, asyncRoute(controller.verifyMfaLogin));
router.post('/refresh', authRateLimiter, validate('refresh'), asyncRoute(controller.refresh));
router.post('/password-reset/request', authRateLimiter, validate('passwordResetRequest'), asyncRoute(controller.requestPasswordReset));
router.post('/password-reset/confirm', authRateLimiter, validate('passwordReset'), asyncRoute(controller.resetPassword));
router.post('/service-token', authenticateService, validate('serviceToken'), asyncRoute(controller.serviceToken));

router.use(authenticate);
router.get('/me', asyncRoute(controller.me));
router.post('/logout', asyncRoute(controller.logout));
router.post('/logout-all', asyncRoute(controller.logoutAll));
router.post('/switch-tenant', asyncRoute(controller.switchTenant));
router.post('/email/verify', asyncRoute(controller.verifyEmail));
router.post('/email/resend', asyncRoute(controller.resendVerification));
router.post('/mfa/setup', asyncRoute(controller.mfaSetup));
router.post('/mfa/enable', asyncRoute(controller.mfaEnable));
router.post('/mfa/disable', asyncRoute(controller.mfaDisable));
router.post('/mfa/backup-codes', asyncRoute(controller.mfaRegenerateBackupCodes));
router.get('/mfa/status', asyncRoute(controller.mfaStatus));

module.exports = router;
