import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  checkReoboteSystems,
  normalizeRemoteMonitoringPayload,
} from '../reoboteSystems.js';

const SECRET = 'a'.repeat(64);

type MockHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    service: 'REOBOTE SISTEMAS',
    status: 'operational',
    checkedAt: '2026-10-26T13:00:00.000Z',
    checks: {
      application: { status: 'operational', uptimeSeconds: 321 },
      api: { status: 'operational' },
      monitoringEndpoint: { status: 'operational' },
      supabase: { status: 'operational', latencyMs: 15 },
      whatsapp: { status: 'connected', lastCheck: '2026-10-26T12:55:00.000Z' },
    },
    ...overrides,
  };
}

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

test('conexão autorizada funciona e envia o segredo só no header', async () => {
  await withMockServer(
    (req, res) => {
      assert.equal(req.method, 'GET');
      assert.equal(req.headers['x-monitoring-secret'], SECRET);
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(validPayload()));
    },
    async (baseUrl) => {
      const result = await checkReoboteSystems({
        baseUrl,
        secret: SECRET,
        timeoutMs: 1000,
      });

      assert.equal(result.configured, true);
      assert.equal(result.state, 'operational');
      assert.equal(result.error, null);
      assert.equal(result.remote?.service, 'REOBOTE SISTEMAS');
      assert.equal(result.remote?.checks.supabase.latencyMs, 15);
      assert.equal(typeof result.latencyMs, 'number');

      const serialized = JSON.stringify(result);
      assert.equal(serialized.includes(SECRET), false);
      assert.equal(serialized.includes(baseUrl), false);
    }
  );
});

test('credencial recusada (401) vira estado indisponível sem vazar segredo', async () => {
  await withMockServer(
    (_req, res) => {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'Credencial de monitoramento inválida.' }));
    },
    async (baseUrl) => {
      const result = await checkReoboteSystems({ baseUrl, secret: SECRET });

      assert.equal(result.state, 'unavailable');
      assert.match(result.error || '', /Credencial de monitoramento recusada/);
      assert.equal(JSON.stringify(result).includes(SECRET), false);
    }
  );
});

test('falha do Supabase remoto é propagada como degradação', async () => {
  const payload = validPayload({
    status: 'degraded',
    checks: {
      application: { status: 'operational', uptimeSeconds: 100 },
      api: { status: 'operational' },
      monitoringEndpoint: { status: 'operational' },
      supabase: { status: 'unavailable', latencyMs: null },
      whatsapp: { status: 'not_configured', lastCheck: null },
    },
  });

  await withMockServer(
    (_req, res) => {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(payload));
    },
    async (baseUrl) => {
      const result = await checkReoboteSystems({ baseUrl, secret: SECRET });

      assert.equal(result.state, 'degraded');
      assert.equal(result.remote?.checks.supabase.status, 'unavailable');
      assert.equal(result.error, null);
    }
  );
});

test('timeout do REOBOTE SISTEMAS não trava e vira indisponível', async () => {
  await withMockServer(
    async (_req, res) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      res.end(JSON.stringify(validPayload()));
    },
    async (baseUrl) => {
      const result = await checkReoboteSystems({
        baseUrl,
        secret: SECRET,
        timeoutMs: 100,
      });

      assert.equal(result.state, 'unavailable');
      assert.match(result.error || '', /Tempo esgotado/);
    }
  );
});

test('resposta inválida é rejeitada sem quebrar a interface', async () => {
  await withMockServer(
    (_req, res) => {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ status: 'operational', clientes: [] }));
    },
    async (baseUrl) => {
      const result = await checkReoboteSystems({ baseUrl, secret: SECRET });
      assert.equal(result.state, 'unavailable');
      assert.match(result.error || '', /Resposta inválida/);
      assert.equal(result.remote, null);
    }
  );

  await withMockServer(
    (_req, res) => {
      res.end('<html>erro</html>');
    },
    async (baseUrl) => {
      const result = await checkReoboteSystems({ baseUrl, secret: SECRET });
      assert.equal(result.state, 'unavailable');
      assert.match(result.error || '', /JSON malformado/);
    }
  );
});

test('HTTP 500 vira indisponível', async () => {
  await withMockServer(
    (_req, res) => {
      res.statusCode = 500;
      res.end('erro');
    },
    async (baseUrl) => {
      const result = await checkReoboteSystems({ baseUrl, secret: SECRET });
      assert.equal(result.state, 'unavailable');
      assert.match(result.error || '', /HTTP 500/);
    }
  );
});

test('integração não configurada não faz chamada e retorna estado explícito', async () => {
  const result = await checkReoboteSystems({ baseUrl: '', secret: '' });

  assert.equal(result.configured, false);
  assert.equal(result.state, 'not_configured');
  assert.equal(result.remote, null);
  assert.match(result.error || '', /não configurada/);
});

test('segredo curto e URL HTTP externa são recusados como configuração inválida', async () => {
  const shortSecret = await checkReoboteSystems({
    baseUrl: 'https://reobote-sistemas.vercel.app',
    secret: 'curto',
  });
  assert.equal(shortSecret.state, 'not_configured');
  assert.match(shortSecret.error || '', /32 caracteres/);

  const insecureUrl = await checkReoboteSystems({
    baseUrl: 'http://example.com',
    secret: SECRET,
  });
  assert.equal(insecureUrl.state, 'not_configured');
  assert.match(insecureUrl.error || '', /HTTPS/);
});

test('campos extras, dados de clientes e tokens são descartados', async () => {
  const payload = validPayload({
    clientes: [{ nome: 'Cliente', telefone: '+55 11 99999-9999' }],
    token: 'segredo-do-cliente',
    whatsapp: { token: 'whatsapp-token' },
  });

  await withMockServer(
    (_req, res) => {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(payload));
    },
    async (baseUrl) => {
      const result = await checkReoboteSystems({ baseUrl, secret: SECRET });
      const serialized = JSON.stringify(result);

      assert.equal(result.state, 'operational');
      for (const forbidden of ['Cliente', '99999', 'segredo-do-cliente', 'whatsapp-token']) {
        assert.equal(serialized.includes(forbidden), false, forbidden);
      }
      assert.deepEqual(Object.keys(result.remote?.checks || {}).sort(), [
        'api',
        'application',
        'monitoringEndpoint',
        'supabase',
        'whatsapp',
      ]);
    }
  );
});

test('normalizador rejeita status desconhecido', () => {
  const invalid = validPayload({
    checks: {
      application: { status: 'ok', uptimeSeconds: 1 },
      api: { status: 'operational' },
      monitoringEndpoint: { status: 'operational' },
      supabase: { status: 'operational', latencyMs: 1 },
      whatsapp: { status: 'connected', lastCheck: null },
    },
  });

  assert.equal(normalizeRemoteMonitoringPayload(invalid), null);
});
