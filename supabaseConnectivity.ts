export type SupabaseProbeStatus = 'operational' | 'degraded' | 'unavailable';

export interface SupabaseConnectivityResult {
  configured: boolean;
  state: 'operational' | 'degraded' | 'unavailable' | 'not_configured';
  checkedAt: string;
  latencyMs: number | null;
  checks: {
    database: {
      status: SupabaseProbeStatus;
      httpStatus: number | null;
      latencyMs: number | null;
    };
    auth: {
      status: SupabaseProbeStatus;
      httpStatus: number | null;
      latencyMs: number | null;
    };
  };
  error: string | null;
}

export interface TestSupabaseConnectivityOptions {
  supabaseUrl?: string;
  anonKey?: string;
  timeoutMs?: number;
  fetchImpl?: (input: string | URL, init?: RequestInit) => Promise<Response>;
}

interface ProbeResult {
  httpStatus: number | null;
  latencyMs: number | null;
  failure: 'timeout' | 'network' | null;
}

const DEFAULT_TIMEOUT_MS = 5000;

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '[::1]'
  );
}

function emptyChecks(): SupabaseConnectivityResult['checks'] {
  return {
    database: { status: 'unavailable', httpStatus: null, latencyMs: null },
    auth: { status: 'unavailable', httpStatus: null, latencyMs: null }
  };
}

async function probe(
  url: URL,
  init: RequestInit,
  timeoutMs: number,
  fetchImpl: (input: string | URL, init?: RequestInit) => Promise<Response>
): Promise<ProbeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetchImpl(url, {
      ...init,
      signal: controller.signal,
      redirect: 'error'
    });

    // O teste só precisa do status; o corpo é descartado sem ser interpretado.
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

function classifyDatabase(result: ProbeResult): {
  status: SupabaseProbeStatus;
  error: string | null;
} {
  if (result.failure === 'timeout') {
    return {
      status: 'unavailable',
      error: 'Tempo esgotado ao consultar a API REST do Supabase.'
    };
  }

  if (result.failure === 'network' || result.httpStatus === null) {
    return {
      status: 'unavailable',
      error: 'Não foi possível conectar à API REST do Supabase.'
    };
  }

  if (result.httpStatus >= 200 && result.httpStatus < 300) {
    return { status: 'operational', error: null };
  }

  if (result.httpStatus === 401 || result.httpStatus === 403) {
    return {
      status: 'unavailable',
      error: 'A chave pública foi recusada pela API REST do Supabase.'
    };
  }

  if (result.httpStatus === 404) {
    return {
      status: 'degraded',
      error: 'A API REST respondeu, mas o recurso de verificação não foi encontrado.'
    };
  }

  return {
    status: 'unavailable',
    error: `A API REST do Supabase respondeu HTTP ${result.httpStatus}.`
  };
}

function classifyAuth(result: ProbeResult): {
  status: SupabaseProbeStatus;
  error: string | null;
} {
  if (result.failure === 'timeout') {
    return {
      status: 'unavailable',
      error: 'Tempo esgotado ao consultar o serviço de autenticação do Supabase.'
    };
  }

  if (result.failure === 'network' || result.httpStatus === null) {
    return {
      status: 'unavailable',
      error: 'Não foi possível conectar ao serviço de autenticação do Supabase.'
    };
  }

  if (result.httpStatus >= 200 && result.httpStatus < 300) {
    return { status: 'operational', error: null };
  }

  if (result.httpStatus === 401 || result.httpStatus === 403) {
    return {
      status: 'unavailable',
      error: 'O serviço de autenticação do Supabase recusou a verificação.'
    };
  }

  return {
    status: 'unavailable',
    error: `O serviço de autenticação do Supabase respondeu HTTP ${result.httpStatus}.`
  };
}

/**
 * Verifica a conectividade real com o Supabase usando somente a chave pública:
 * uma chamada HEAD ao PostgREST e uma chamada de saúde ao Auth. Nenhuma linha,
 * URL, chave ou conteúdo de resposta é devolvido ao navegador.
 */
export async function testSupabaseConnectivity(
  options: TestSupabaseConnectivityOptions = {}
): Promise<SupabaseConnectivityResult> {
  const checkedAt = new Date().toISOString();
  const supabaseUrl = (
    options.supabaseUrl !== undefined
      ? options.supabaseUrl
      : process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  ).trim();
  const anonKey = (
    options.anonKey !== undefined
      ? options.anonKey
      : process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
  ).trim();

  if (!supabaseUrl || !anonKey) {
    return {
      configured: false,
      state: 'not_configured',
      checkedAt,
      latencyMs: null,
      checks: emptyChecks(),
      error: 'Supabase não configurado no servidor (SUPABASE_URL / SUPABASE_ANON_KEY).'
    };
  }

  let base: URL;
  try {
    base = new URL(supabaseUrl);
  } catch {
    return {
      configured: false,
      state: 'not_configured',
      checkedAt,
      latencyMs: null,
      checks: emptyChecks(),
      error: 'SUPABASE_URL inválida.'
    };
  }

  if (base.protocol !== 'https:' && !isLoopbackHost(base.hostname)) {
    return {
      configured: false,
      state: 'not_configured',
      checkedAt,
      latencyMs: null,
      checks: emptyChecks(),
      error: 'SUPABASE_URL deve usar HTTPS.'
    };
  }

  const requestedTimeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutMs = Math.max(50, Math.min(requestedTimeout, 8000));
  const fetchImpl = options.fetchImpl ?? fetch;
  const startedAt = Date.now();

  const [databaseProbe, authProbe] = await Promise.all([
    probe(
      new URL('/rest/v1/support_profiles?select=id&limit=1', base),
      {
        method: 'HEAD',
        headers: {
          accept: 'application/json',
          apikey: anonKey,
          authorization: `Bearer ${anonKey}`,
          'user-agent': 'ReoboteSuporte/1.0 (supabase-connectivity)'
        }
      },
      timeoutMs,
      fetchImpl
    ),
    probe(
      new URL('/auth/v1/health', base),
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          apikey: anonKey,
          'user-agent': 'ReoboteSuporte/1.0 (supabase-auth-health)'
        }
      },
      timeoutMs,
      fetchImpl
    )
  ]);

  const database = classifyDatabase(databaseProbe);
  const auth = classifyAuth(authProbe);

  let state: SupabaseConnectivityResult['state'];
  if (database.status === 'operational' && auth.status === 'operational') {
    state = 'operational';
  } else if (database.status === 'unavailable' && auth.status === 'unavailable') {
    state = 'unavailable';
  } else {
    state = 'degraded';
  }

  const errors = [database.error, auth.error].filter(
    (value): value is string => Boolean(value)
  );

  return {
    configured: true,
    state,
    checkedAt,
    latencyMs: Date.now() - startedAt,
    checks: {
      database: {
        status: database.status,
        httpStatus: databaseProbe.httpStatus,
        latencyMs: databaseProbe.latencyMs
      },
      auth: {
        status: auth.status,
        httpStatus: authProbe.httpStatus,
        latencyMs: authProbe.latencyMs
      }
    },
    error: errors.length ? errors.join(' ') : null
  };
}
