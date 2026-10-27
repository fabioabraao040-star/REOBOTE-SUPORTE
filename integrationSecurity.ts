import { randomBytes } from 'node:crypto';

export type IntegrationSecurityState =
  | 'passed'
  | 'failed'
  | 'unavailable'
  | 'not_configured';

export interface IntegrationSecurityResult {
  configured: boolean;
  state: IntegrationSecurityState;
  checkedAt: string;
  latencyMs: number | null;
  checks: {
    withoutCredential: {
      status: number | null;
      passed: boolean;
      latencyMs: number | null;
    };
    invalidCredential: {
      status: number | null;
      passed: boolean;
      latencyMs: number | null;
    };
  };
  error: string | null;
}

export interface TestIntegrationSecurityOptions {
  baseUrl?: string;
  timeoutMs?: number;
  invalidCredential?: string;
  fetchImpl?: (input: string | URL, init?: RequestInit) => Promise<Response>;
}

interface ProbeResult {
  httpStatus: number | null;
  latencyMs: number | null;
  failure: 'timeout' | 'network' | null;
}

const DEFAULT_TIMEOUT_MS = 4000;

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '[::1]'
  );
}

function isRejected(status: number | null): boolean {
  return status === 401 || status === 403;
}

async function probe(
  endpoint: URL,
  headers: Record<string, string>,
  timeoutMs: number,
  fetchImpl: (input: string | URL, init?: RequestInit) => Promise<Response>
): Promise<ProbeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetchImpl(endpoint, {
      method: 'GET',
      headers,
      signal: controller.signal,
      redirect: 'error'
    });

    // O teste só precisa do código HTTP; nenhum corpo é lido ou devolvido.
    try {
      await response.body?.cancel();
    } catch {
      // Ignora falha ao descartar o corpo: o status já foi obtido.
    }

    return {
      httpStatus: response.status,
      latencyMs: Date.now() - startedAt,
      failure: null
    };
  } catch (error) {
    const timedOut =
      controller.signal.aborted ||
      (error instanceof Error &&
        (error.name === 'AbortError' || error.name === 'TimeoutError'));

    return {
      httpStatus: null,
      latencyMs: Date.now() - startedAt,
      failure: timedOut ? 'timeout' : 'network'
    };
  } finally {
    clearTimeout(timer);
  }
}

function failureMessage(label: string, result: ProbeResult): string {
  if (result.failure === 'timeout') {
    return `Tempo esgotado ao verificar a chamada ${label}.`;
  }

  if (result.failure === 'network' || result.httpStatus === null) {
    return `Não foi possível alcançar o endpoint na chamada ${label}.`;
  }

  if (result.httpStatus >= 200 && result.httpStatus < 300) {
    return `Falha de segurança: o endpoint aceitou a chamada ${label}.`;
  }

  if (result.httpStatus === 404) {
    return 'Endpoint de monitoramento não encontrado (HTTP 404).';
  }

  if (result.httpStatus === 503) {
    return 'Endpoint de monitoramento do REOBOTE SISTEMAS não configurado (HTTP 503).';
  }

  return `O endpoint respondeu HTTP ${result.httpStatus}; esperado 401 ou 403.`;
}

function emptyChecks(): IntegrationSecurityResult['checks'] {
  return {
    withoutCredential: { status: null, passed: false, latencyMs: null },
    invalidCredential: { status: null, passed: false, latencyMs: null }
  };
}

/**
 * Testa a proteção do endpoint de monitoramento do REOBOTE SISTEMAS sem usar
 * o segredo real: uma chamada sem credencial e outra com um valor aleatório.
 * O teste passa somente quando as duas chamadas são rejeitadas com 401/403.
 */
export async function testIntegrationSecurity(
  options: TestIntegrationSecurityOptions = {}
): Promise<IntegrationSecurityResult> {
  const checkedAt = new Date().toISOString();
  const baseUrl = (options.baseUrl ?? process.env.REOBOTE_SYSTEMS_URL ?? '').trim();

  if (!baseUrl) {
    return {
      configured: false,
      state: 'not_configured',
      checkedAt,
      latencyMs: null,
      checks: emptyChecks(),
      error: 'Integração não configurada no servidor (REOBOTE_SYSTEMS_URL).'
    };
  }

  let endpoint: URL;
  try {
    endpoint = new URL('/api/monitoring/status', baseUrl);
  } catch {
    return {
      configured: false,
      state: 'not_configured',
      checkedAt,
      latencyMs: null,
      checks: emptyChecks(),
      error: 'REOBOTE_SYSTEMS_URL inválida.'
    };
  }

  if (endpoint.protocol !== 'https:' && !isLoopbackHost(endpoint.hostname)) {
    return {
      configured: false,
      state: 'not_configured',
      checkedAt,
      latencyMs: null,
      checks: emptyChecks(),
      error: 'REOBOTE_SYSTEMS_URL deve usar HTTPS.'
    };
  }

  const requestedTimeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutMs = Math.max(50, Math.min(requestedTimeout, 8000));
  const fetchImpl = options.fetchImpl ?? fetch;
  const invalidCredential =
    options.invalidCredential ?? randomBytes(32).toString('hex');
  const baseHeaders = {
    accept: 'application/json',
    'user-agent': 'ReoboteSuporte/1.0 (integration-security-test)'
  };

  const startedAt = Date.now();
  const [withoutCredential, invalidCredentialProbe] = await Promise.all([
    probe(endpoint, baseHeaders, timeoutMs, fetchImpl),
    probe(
      endpoint,
      { ...baseHeaders, 'x-monitoring-secret': invalidCredential },
      timeoutMs,
      fetchImpl
    )
  ]);

  const withoutPassed = isRejected(withoutCredential.httpStatus);
  const invalidPassed = isRejected(invalidCredentialProbe.httpStatus);

  let state: IntegrationSecurityState;
  if (withoutPassed && invalidPassed) {
    state = 'passed';
  } else if (
    withoutCredential.httpStatus === null &&
    invalidCredentialProbe.httpStatus === null
  ) {
    state = 'unavailable';
  } else {
    state = 'failed';
  }

  let error: string | null = null;
  if (!withoutPassed) {
    error = failureMessage('sem credencial', withoutCredential);
  } else if (!invalidPassed) {
    error = failureMessage('com credencial inválida', invalidCredentialProbe);
  }

  return {
    configured: true,
    state,
    checkedAt,
    latencyMs: Date.now() - startedAt,
    checks: {
      withoutCredential: {
        status: withoutCredential.httpStatus,
        passed: withoutPassed,
        latencyMs: withoutCredential.latencyMs
      },
      invalidCredential: {
        status: invalidCredentialProbe.httpStatus,
        passed: invalidPassed,
        latencyMs: invalidCredentialProbe.latencyMs
      }
    },
    error
  };
}
