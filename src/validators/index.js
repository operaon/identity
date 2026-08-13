const { z } = require('zod');

const password = z.string().min(12).max(128);
const email = z.string().email().max(320);
const uuid = z.string().uuid();

const schemas = {
  register: z.object({ email, password, firstName: z.string().min(1).max(120), lastName: z.string().min(1).max(120), phone: z.string().max(40).optional(), tenantName: z.string().min(2).max(180), tenantSlug: z.string().min(2).max(180).optional(), organizationName: z.string().min(2).max(180).optional() }),
  professionalRegister: z.object({ email, password, firstName: z.string().min(1).max(120), lastName: z.string().min(1).max(120), phone: z.string().max(40).optional(), tenantId: uuid }),
  patientRegister: z.object({ email, password, firstName: z.string().min(1).max(120), lastName: z.string().min(1).max(120), phone: z.string().max(40).optional(), tenantId: uuid.optional() }),
  login: z.object({ email, password }),
  refresh: z.object({ refreshToken: z.string().min(20) }),
  passwordResetRequest: z.object({ email }),
  passwordReset: z.object({ token: z.string().min(20), password }),
  mfa: z.object({ code: z.string().min(6).max(20) }),
  role: z.object({ name: z.string().min(1).max(80), slug: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/).max(100), description: z.string().max(255).optional(), tenantId: uuid.nullish(), permissionIds: z.array(uuid).optional() }),
  permission: z.object({ resource: z.string().min(1).max(80), action: z.string().min(1).max(80), description: z.string().max(255).optional() }),
  assignRole: z.object({ userId: uuid, roleId: uuid, tenantId: uuid.nullish() }),
};

const validate = (schemaName, source = 'body') => (req, _res, next) => {
  const result = schemas[schemaName].safeParse(req[source]);
  if (!result.success) return next(Object.assign(new Error('Payload inválido'), { statusCode: 400, code: 'VALIDATION_ERROR', details: result.error.flatten() }));
  req[source] = result.data;
  next();
};

module.exports = { schemas, validate, password, email, uuid };
