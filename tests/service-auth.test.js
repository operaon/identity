'use strict';

const env = require('../src/config/env');
const { authenticateService } = require('../src/middlewares/serviceAuth');

const originalKeys = { ...env.serviceApiKeys };
const originalCommunication = { ...env.communication };

const execute = (headers = {}, socket = {}) => new Promise((resolve) => {
  authenticateService(
    { headers, socket, client: socket },
    {},
    (error) => resolve(error || null),
  );
});

afterEach(() => {
  Object.keys(env.serviceApiKeys).forEach((key) => delete env.serviceApiKeys[key]);
  Object.assign(env.serviceApiKeys, originalKeys);
  Object.assign(env.communication, originalCommunication);
});

describe('autenticação de serviço do Identity', () => {
  test('aceita chave identificada pelo X-Key-Id', async () => {
    env.serviceApiKeys['service-key-v0'] = 'previous-service-secret';

    const error = await execute({
      'x-service-key': 'previous-service-secret',
      'x-key-id': 'service-key-v0',
    });

    expect(error).toBeNull();
  });

  test('rejeita chave válida apresentada com key id diferente', async () => {
    const error = await execute({
      'x-service-key': env.serviceApiKey,
      'x-key-id': 'service-key-forjado',
    });

    expect(error).toEqual(expect.objectContaining({ code: 'INVALID_SERVICE_KEY' }));
  });

  test('exige X-Service-Id e mTLS quando configurado', async () => {
    env.communication.requireServiceId = true;
    env.communication.requireMtls = true;

    const headers = {
      'x-service-key': env.serviceApiKey,
      'x-key-id': env.communication.keyId,
    };
    const withoutHeaders = await execute(headers, { authorized: false });
    expect(withoutHeaders).toEqual(expect.objectContaining({ code: 'INVALID_SERVICE_ID' }));

    const withServiceId = await execute({ ...headers, 'x-service-id': 'operaon-gateway' }, { authorized: false });
    expect(withServiceId).toEqual(expect.objectContaining({ code: 'MTLS_REQUIRED' }));

    const withMtls = await execute({ ...headers, 'x-service-id': 'operaon-gateway' }, { authorized: true });
    expect(withMtls).toBeNull();
  });
});
