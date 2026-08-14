'use strict';

const request = require('supertest');
const app = require('../src/app');

const serviceKey = process.env.SERVICE_API_KEY;
const userId = '00000000-0000-4000-8000-000000000011';
const tenantId = '00000000-0000-4000-8000-000000000012';

describe('contrato de segurança do Identity', () => {
  test('rejeita service-token sem X-Service-Key', async () => {
    const response = await request(app)
      .post('/api/auth/service-token')
      .send({ userId, tenantId, audience: ['operaon-catalog'] });

    expect(response.status).toBe(401);
  });

  test('rejeita audience de serviço não configurada', async () => {
    const response = await request(app)
      .post('/api/auth/service-token')
      .set('X-Service-Key', serviceKey)
      .send({ userId, tenantId, audience: ['servico-nao-autorizado'] });

    expect(response.status).toBe(401);
  });

  test('emite access token para audience configurada e preserva permissions dinâmicas', async () => {
    const response = await request(app)
      .post('/api/auth/service-token')
      .set('X-Service-Key', serviceKey)
      .set('X-Key-Id', 'service-key-v1')
      .send({
        userId,
        tenantId,
        audience: ['operaon-catalog'],
        permissions: ['catalog:read', 'catalog:write'],
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expect(response.body.data.audience).toEqual(['operaon-catalog']);
  });

  test('rejeita payload com userId que não seja UUID', async () => {
    const response = await request(app)
      .post('/api/auth/service-token')
      .set('X-Service-Key', serviceKey)
      .send({ userId: 'usuario-invalido', audience: ['operaon-catalog'] });

    expect(response.status).toBe(400);
  });
});
