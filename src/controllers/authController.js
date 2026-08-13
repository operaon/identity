const authService = require('../services/authService');
const mfaService = require('../services/mfaService');

const register = async (req, res) => res.status(201).json({ success: true, data: await authService.register(req.body) });
const registerProfessional = async (req, res) => res.status(201).json({ success: true, data: await authService.registerProfessional(req.body) });
const registerPatient = async (req, res) => res.status(201).json({ success: true, data: await authService.registerPatient(req.body) });
const login = async (req, res) => res.json({ success: true, data: await authService.login(req.body, { ipAddress: req.ip, userAgent: req.get('user-agent'), deviceName: req.body.deviceName, tenantId: req.body.tenantId }) });
const verifyMfaLogin = async (req, res) => res.json({ success: true, data: await authService.verifyMfaLogin(req.body.mfaToken, req.body.code, { ipAddress: req.ip, userAgent: req.get('user-agent') }) });
const refresh = async (req, res) => res.json({ success: true, data: await authService.refresh(req.body.refreshToken) });
const logout = async (req, res) => res.json({ success: true, data: await authService.logout(req.user.id, req.auth.sessionId) });
const logoutAll = async (req, res) => res.json({ success: true, data: await authService.logoutAll(req.user.id) });
const me = async (req, res) => res.json({ success: true, data: await authService.getProfile(req.user.id, req.tenantId) });
const switchTenant = async (req, res) => res.json({ success: true, data: await authService.switchTenant(req.user.id, req.body.tenantId, { ipAddress: req.ip, userAgent: req.get('user-agent') }) });
const requestPasswordReset = async (req, res) => res.json({ success: true, data: await authService.requestPasswordReset(req.body.email) });
const resetPassword = async (req, res) => res.json({ success: true, data: await authService.resetPassword(req.body.token, req.body.password) });
const verifyEmail = async (req, res) => res.json({ success: true, data: await authService.verifyEmail(req.user.id, req.body.token) });
const resendVerification = async (req, res) => res.json({ success: true, data: await authService.resendVerification(req.user.id) });
const mfaSetup = async (req, res) => res.json({ success: true, data: await mfaService.generateSetup(req.user.id) });
const mfaEnable = async (req, res) => res.json({ success: true, data: await mfaService.enable(req.user.id, req.body.code) });
const mfaDisable = async (req, res) => res.json({ success: true, data: await mfaService.disable(req.user.id, req.body.code) });
const mfaRegenerateBackupCodes = async (req, res) => res.json({ success: true, data: await mfaService.regenerateBackupCodes(req.user.id, req.body.code) });
const mfaStatus = async (req, res) => res.json({ success: true, data: await mfaService.status(req.user.id) });
const serviceToken = async (req, res) => res.json({ success: true, data: await authService.issueServiceToken(req.body || {}) });

module.exports = { register, registerProfessional, registerPatient, login, verifyMfaLogin, refresh, logout, logoutAll, me, switchTenant, requestPasswordReset, resetPassword, verifyEmail, resendVerification, mfaSetup, mfaEnable, mfaDisable, mfaRegenerateBackupCodes, mfaStatus, serviceToken };
