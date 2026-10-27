import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { testIntegrationSecurity } from '../integrationSecurity.js';

const INVALID_CREDENTIAL = 'credencial-invalida-de-teste-1234567890';

type MockHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;

async function withMockServer(handler: MockHandler, run: (baseUrl: string) => Promise<void>) {
  const server = createServer((req, res) => {
    void Promise.resolve(handler(req, res)).catch(() => {
      if (!res.writableEnded) {
        res.statusCode = 500;
        res.end('mock error');
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test('teste de segurança passa quando sem credencial e credencial inválida recebem 401', async () => {
  const received: Array<string | string[] | undefined> = [];

  await withMockServer(
    (req, res) => {
      received.push(req.headers['x-monitoring-secret']);
      res.statusCode = 401;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'não autorizado' }));
    },
    async (baseUrl) => {
      const result = await testIntegrationSecurity({
        baseUrl,
        invalidCredential: INVALID_CREDENTIAL,
        timeoutMs: 1000,
      });

      assert.equal(result.configured, true);
      assert.equal(result.state, 'passed');
      assert.equal(result.error, null);
      assert.equal(result.checks.withoutCredential.status, 401);
      assert.equal(result.checks.withoutCredential.passed, true);
      assert.equal(result.checks.invalidCredential.status, 401);
      assert.equal(result.checks.invalidCredential.passed, true);
      assert.equal(received.length, 2);
      assert.equal(received.includes(undefined), true);
      assert.equal(received.includes(INVALID_CREDENTIAL), true);

      const serialized = JSON.stringify(result);
      assert.equal(serialized.includes(INVALID_CREDENTIAL), false);
      assert.equal(serialized.includes(baseUrl), false);
    }
  );
});

test('endpoint que aceita chamada sem credencial falha no teste de segurança', async () => {
  await withMockServer(
    (_req, res) => {
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true }));
    },
    async (baseUrl) => {
      const result = await testIntegrationSecurity({
        baseUrl,
        invalidCredential: INVALID_CREDENTIAL,
        timeoutMs: 1000,
      });

      assert.equal(result.state, 'failed');
      assert.equal(result.checks.withoutCredential.passed, false);
      assert.match(result.error || '', /Falha de segurança.*sem credencial/i);
    }
  );
});

test('endpoint que só aceita a credencial inválida também falha', async () => {
  await withMockServer(
    (req, res) => {
      res.statusCode =
        req.headers['x-monitoring-secret'] === INVALID_CREDENTIAL ? 200 : 401;
      res.end();
    },
    async (baseUrl) => {
      const result = await testIntegrationSecurity({
        baseUrl,
        invalidCredential: INVALID_CREDENTIAL,
        timeoutMs: 1000,
      });

      assert.equal(result.state, 'failed');
      assert.equal(result.checks.withoutCredential.passed, true);
      assert.equal(result.checks.invalidCredential.passed, false);
      assert.match(result.error || '', /credencial inválida/i);
    }
  );
});

test('404 não é confundido com endpoint protegido', async () => {
  await withMockServer(
    (_req, res) => {
      res.statusCode = 404;
      res.end();
    },
    async (baseUrl) => {
      const result = await testIntegrationSecurity({
        baseUrl,
        invalidCredential: INVALID_CREDENTIAL,
        timeoutMs: 1000,
      });

      assert.equal(result.state, 'failed');
      assert.match(result.error || '', /não encontrado.*404/i);
    }
  );
});

test('timeout no teste de segurança vira indisponível', async () => {
  await withMockServer(
    (_req, res) => {
      setTimeout(() => {
        if (!res.writableEnded) {
          res.statusCode = 401;
          res.end();
        }
      }, 250);
    },
    async (baseUrl) => {
      const result = await testIntegrationSecurity({
        baseUrl,
        invalidCredential: INVALID_CREDENTIAL,
        timeoutMs: 50,
      });

      assert.equal(result.state, 'unavailable');
      assert.match(result.error || '', /Tempo esgotado/i);
    }
  );
});

test('integração ausente não executa o teste de segurança', async () => {
  const result = await testIntegrationSecurity({ baseUrl: '' });
  assert.equal(result.configured, false);
  assert.equal(result.state, 'not_configured');
  assert.match(result.error || '', /REOBOTE_SYSTEMS_URL/);
});
