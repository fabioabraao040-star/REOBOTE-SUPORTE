import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { testSupabaseConnectivity } from '../supabaseConnectivity.js';

const ANON_KEY = 'test-anon-key-1234567890';

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

test('conectividade real do Supabase valida REST e Auth sem vazar chave ou URL', async () => {
  await withMockServer(
    (req, res) => {
      if (req.url?.startsWith('/rest/v1/support_profiles')) {
        assert.equal(req.method, 'HEAD');
        assert.equal(req.headers.apikey, ANON_KEY);
        assert.equal(req.headers.authorization, `Bearer ${ANON_KEY}`);
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.url === '/auth/v1/health') {
        assert.equal(req.method, 'GET');
        assert.equal(req.headers.apikey, ANON_KEY);
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }

      res.statusCode = 404;
      res.end();
    },
    async (baseUrl) => {
      const result = await testSupabaseConnectivity({
        supabaseUrl: baseUrl,
        anonKey: ANON_KEY,
        timeoutMs: 1000,
      });

      assert.equal(result.configured, true);
      assert.equal(result.state, 'operational');
      assert.equal(result.error, null);
      assert.equal(result.checks.database.status, 'operational');
      assert.equal(result.checks.database.httpStatus, 204);
      assert.equal(result.checks.auth.status, 'operational');
      assert.equal(result.checks.auth.httpStatus, 200);
      assert.equal(typeof result.latencyMs, 'number');

      const serialized = JSON.stringify(result);
      assert.equal(serialized.includes(ANON_KEY), false);
      assert.equal(serialized.includes(baseUrl), false);
    }
  );
});

test('Auth indisponível vira degradação com erro real', async () => {
  await withMockServer(
    (req, res) => {
      if (req.url?.startsWith('/rest/v1/support_profiles')) {
        res.statusCode = 200;
        res.end();
        return;
      }
      res.statusCode = 500;
      res.end();
    },
    async (baseUrl) => {
      const result = await testSupabaseConnectivity({
        supabaseUrl: baseUrl,
        anonKey: ANON_KEY,
        timeoutMs: 1000,
      });

      assert.equal(result.state, 'degraded');
      assert.equal(result.checks.database.status, 'operational');
      assert.equal(result.checks.auth.status, 'unavailable');
      assert.match(result.error || '', /autenticação.*HTTP 500/i);
    }
  );
});

test('chave recusada pelo PostgREST não é reportada como sucesso', async () => {
  await withMockServer(
    (req, res) => {
      if (req.url?.startsWith('/rest/v1/support_profiles')) {
        res.statusCode = 401;
        res.end();
        return;
      }
      res.statusCode = 200;
      res.end(JSON.stringify({ status: 'ok' }));
    },
    async (baseUrl) => {
      const result = await testSupabaseConnectivity({
        supabaseUrl: baseUrl,
        anonKey: ANON_KEY,
        timeoutMs: 1000,
      });

      assert.equal(result.state, 'degraded');
      assert.equal(result.checks.database.status, 'unavailable');
      assert.match(result.error || '', /chave pública.*recusada/i);
    }
  );
});

test('falha total do Supabase vira indisponível', async () => {
  await withMockServer(
    (_req, res) => {
      res.statusCode = 503;
      res.end();
    },
    async (baseUrl) => {
      const result = await testSupabaseConnectivity({
        supabaseUrl: baseUrl,
        anonKey: ANON_KEY,
        timeoutMs: 1000,
      });

      assert.equal(result.state, 'unavailable');
      assert.equal(result.checks.database.status, 'unavailable');
      assert.equal(result.checks.auth.status, 'unavailable');
      assert.match(result.error || '', /HTTP 503/);
    }
  );
});

test('timeout é reportado como indisponível sem inventar sucesso', async () => {
  await withMockServer(
    (_req, res) => {
      setTimeout(() => {
        if (!res.writableEnded) {
          res.statusCode = 200;
          res.end();
        }
      }, 250);
    },
    async (baseUrl) => {
      const result = await testSupabaseConnectivity({
        supabaseUrl: baseUrl,
        anonKey: ANON_KEY,
        timeoutMs: 50,
      });

      assert.equal(result.state, 'unavailable');
      assert.match(result.error || '', /Tempo esgotado/i);
    }
  );
});

test('configuração ausente ou URL inválida não executa teste', async () => {
  const missing = await testSupabaseConnectivity({ supabaseUrl: '', anonKey: '' });
  assert.equal(missing.state, 'not_configured');
  assert.equal(missing.configured, false);

  const invalid = await testSupabaseConnectivity({
    supabaseUrl: 'não-é-uma-url',
    anonKey: ANON_KEY,
  });
  assert.equal(invalid.state, 'not_configured');
  assert.equal(invalid.configured, false);
  assert.match(invalid.error || '', /SUPABASE_URL inválida/);
});
