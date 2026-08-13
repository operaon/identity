const request = require('supertest');
const speakeasy = require('speakeasy');
const app = require('../src/app');
const { User } = require('../src/models');
const { decrypt } = require('../src/utils/security');
const env = require('../src/config/env');

describe('Identity authentication and dynamic RBAC', () => {
  let accessToken;
  let refreshToken;
  let tenantId;
  let userId;

  test('health endpoint is available', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.service).toBe('identity');
  });

  test('registers a tenant administrator with dynamic role and permissions', async () => {
    const response = await request(app).post('/api/auth/register').send({
      email: 'owner@example.com',
      password: 'StrongPassword!123',
      firstName: 'Owner',
      lastName: 'Test',
      tenantName: 'Tenant Test',
      tenantSlug: 'tenant-test',
    });
    expect(response.status).toBe(201);
    expect(response.body.data.user.email).toBe('owner@example.com');
    expect(response.body.data.roles).toEqual(expect.arrayContaining([expect.objectContaining({ slug: 'tenant_admin' })]));
    expect(response.body.data.permissions).toEqual(expect.arrayContaining(['rbac:read', 'rbac:write']));
    accessToken = response.body.data.accessToken;
    refreshToken = response.body.data.refreshToken;
    tenantId = response.body.data.tenantId;
    userId = response.body.data.user.id;
  });

  test('returns the authenticated profile and tenant context', async () => {
    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.user.id).toBe(userId);
    expect(response.body.data.tenantId).toBe(tenantId);
    expect(response.body.data.permissions).toContain('tenant:read');
  });

  test('refreshes the session with a rotated refresh token', async () => {
    const response = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBeTruthy();
    expect(response.body.data.refreshToken).not.toBe(refreshToken);
    refreshToken = response.body.data.refreshToken;
    accessToken = response.body.data.accessToken;
  });

  test('evaluates dynamic RBAC permissions', async () => {
    const response = await request(app).get('/api/rbac/evaluate').query({ resource: 'rbac', action: 'write' }).set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.allowed).toBe(true);
  });

  test('creates and assigns a tenant-specific role dynamically', async () => {
    const role = await request(app).post('/api/rbac/roles').set('Authorization', `Bearer ${accessToken}`).send({ name: 'Auditor', slug: 'auditor', tenantId, permissionIds: [] });
    expect(role.status).toBe(201);
    expect(role.body.data.slug).toBe('auditor');
    const assignment = await request(app).post('/api/rbac/assignments').set('Authorization', `Bearer ${accessToken}`).send({ userId, roleId: role.body.data.id, tenantId });
    expect(assignment.status).toBe(201);

    const reauthenticated = await request(app).post('/api/auth/login').send({
      email: 'owner@example.com',
      password: 'StrongPassword!123',
      tenantId,
    });
    expect(reauthenticated.status).toBe(200);
    refreshToken = reauthenticated.body.data.refreshToken;
    accessToken = reauthenticated.body.data.accessToken;
  });

  test('supports MFA setup and activation', async () => {
    const setup = await request(app).post('/api/auth/mfa/setup').set('Authorization', `Bearer ${accessToken}`);
    expect(setup.status).toBe(200);
    expect(setup.body.data.qrCode).toMatch(/^data:image/);
    const user = await User.findByPk(userId);
    const secret = decrypt(user.mfaSecretEncrypted, env.mfaEncryptionKey);
    const code = speakeasy.totp({ secret, encoding: 'base32' });
    const enable = await request(app).post('/api/auth/mfa/enable').set('Authorization', `Bearer ${accessToken}`).send({ code });
    expect(enable.status).toBe(200);
    expect(enable.body.data.enabled).toBe(true);
  });

  test('logs out and invalidates the access token', async () => {
    const response = await request(app).post('/api/auth/logout-all').set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    const profile = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${accessToken}`);
    expect(profile.status).toBe(401);
  });
});
