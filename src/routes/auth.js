const express = require('express');
const controller = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const { authenticateService } = require('../middlewares/serviceAuth');
const { validate } = require('../validators');
const { authRateLimiter } = require('../middlewares/operational');

const router = express.Router();

router.post('/register', authRateLimiter, validate('register'), controller.register);
router.post('/register-professional', authRateLimiter, validate('professionalRegister'), controller.registerProfessional);
router.post('/register-patient', authRateLimiter, validate('patientRegister'), controller.registerPatient);
router.post('/login', authRateLimiter, validate('login'), controller.login);
router.post('/mfa/verify', authRateLimiter, controller.verifyMfaLogin);
router.post('/refresh', authRateLimiter, validate('refresh'), controller.refresh);
router.post('/password-reset/request', authRateLimiter, validate('passwordResetRequest'), controller.requestPasswordReset);
router.post('/password-reset/confirm', authRateLimiter, validate('passwordReset'), controller.resetPassword);
router.post('/service-token', authenticateService, controller.serviceToken);

router.use(authenticate);
router.get('/me', controller.me);
router.post('/logout', controller.logout);
router.post('/logout-all', controller.logoutAll);
router.post('/switch-tenant', controller.switchTenant);
router.post('/email/verify', controller.verifyEmail);
router.post('/email/resend', controller.resendVerification);
router.post('/mfa/setup', controller.mfaSetup);
router.post('/mfa/enable', controller.mfaEnable);
router.post('/mfa/disable', controller.mfaDisable);
router.post('/mfa/backup-codes', controller.mfaRegenerateBackupCodes);
router.get('/mfa/status', controller.mfaStatus);

module.exports = router;
