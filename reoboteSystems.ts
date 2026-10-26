export type ReoboteSystemsState =
  | 'operational'
  | 'degraded'
  | 'unavailable'
  | 'not_configured';

export type RemoteOperationalStatus = 'operational' | 'degraded' | 'unavailable';
export type RemoteWhatsAppStatus =
  | 'connected'
  | 'configured'
  | 'not_configured'
  | 'unavailable';

export interface ReoboteSystemsRemoteChecks {
  application: {
    status: RemoteOperationalStatus;
    uptimeSeconds: number | null;
  };
  api: {
    status: RemoteOperationalStatus;
  };
  monitoringEndpoint: {
    status: RemoteOperationalStatus;
  };
  supabase: {
    status: RemoteOperationalStatus;
    latencyMs: number | null;
  };
  whatsapp: {
    status: RemoteWhatsAppStatus;
    lastCheck: string | null;
  };
}

export interface ReoboteSystemsRemote {
  service: 'REOBOTE SISTEMAS';
  status: 'operational' | 'degraded';
  checkedAt: string;
  checks: ReoboteSystemsRemoteChecks;
}

export interface ReoboteSystemsResult {
  configured: boolean;
  state: ReoboteSystemsState;
  checkedAt: string;
  latencyMs: number | null;
  error: string | null;
  remote: ReoboteSystemsRemote | null;
}

export interface CheckReoboteSystemsOptions {
  baseUrl?: string;
  secret?: string;
  timeoutMs?: number;
  fetchImpl?: (input: string | URL, init?: RequestInit) => Promise<Response>;
}

const DEFAULT_TIMEOUT_MS = 8000;
const MAX_RESPONSE_BYTES = 64 * 1024;
const MIN_SECRET_LENGTH = 32;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '[::1]'
  );
}

function isValidIsoDate(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value));
}

function toFiniteNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : null;
}

function toShortStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length <= 64 ? value : null;
}

/**
 * Valida e reconstrói a resposta do REOBOTE SISTEMAS usando lista fechada de
 * campos. Qualquer informação extra (inclusive dados de clientes ou tokens)
 * é descartada antes de chegar ao navegador.
 */
export function normalizeRemoteMonitoringPayload(payload: unknown): ReoboteSystemsRemote | null {
  if (!isRecord(payload)) return null;

  if (payload.service !== 'REOBOTE SISTEMAS') return null;
  if (!isOneOf(payload.status, ['operational', 'degraded'] as const)) return null;
  if (!isValidIsoDate(payload.checkedAt)) return null;

  const checks = payload.checks;
  if (!isRecord(checks)) return null;

  const application = checks.application;
  const api = checks.api;
  const monitoringEndpoint = checks.monitoringEndpoint;
  const supabase = checks.supabase;
  const whatsapp = checks.whatsapp;

  if (!isRecord(application) || !isRecord(api) || !isRecord(monitoringEndpoint)) return null;
  if (!isRecord(supabase) || !isRecord(whatsapp)) return null;

  if (!isOneOf(application.status, ['operational', 'degraded', 'unavailable'] as const)) {
    return null;
  }
  if (!isOneOf(api.status, ['operational', 'degraded', 'unavailable'] as const)) {
    return null;
  }
  if (!isOneOf(monitoringEndpoint.status, ['operational', 'degraded', 'unavailable'] as const)) {
    return null;
  }
  if (!isOneOf(supabase.status, ['operational', 'degraded', 'unavailable'] as const)) {
    return null;
  }
  if (
    !isOneOf(whatsapp.status, [
      'connected',
      'configured',
      'not_configured',
      'unavailable',
    ] as const)
  ) {
    return null;
  }

  const applicationUptime =
    typeof application.uptimeSeconds === 'number' &&
    Number.isFinite(application.uptimeSeconds) &&
    application.uptimeSeconds >= 0
      ? Math.round(application.uptimeSeconds)
      : null;

  const whatsappLastCheck =
    whatsapp.lastCheck === null || whatsapp.lastCheck === undefined
      ? null
      : toShortStringOrNull(whatsapp.lastCheck);

  return {
    service: 'REOBOTE SISTEMAS',
    status: payload.status,
    checkedAt: payload.checkedAt,
    checks: {
      application: {
        status: application.status,
        uptimeSeconds: applicationUptime,
      },
      api: {
        status: api.status,
      },
      monitoringEndpoint: {
        status: monitoringEndpoint.status,
      },
      supabase: {
        status: supabase.status,
        latencyMs: toFiniteNumberOrNull(supabase.latencyMs),
      },
      whatsapp: {
        status: whatsapp.status,
        lastCheck: whatsappLastCheck,
      },
    },
  };
}

function normalizeState(remote: ReoboteSystemsRemote): 'operational' | 'degraded' {
  const criticalCheckFailed =
    remote.checks.application.status !== 'operational' ||
    remote.checks.api.status !== 'operational' ||
    remote.checks.monitoringEndpoint.status !== 'operational' ||
    remote.checks.supabase.status !== 'operational' ||
    remote.checks.whatsapp.status === 'configured' ||
    remote.checks.whatsapp.status === 'unavailable';

  return remote.status === 'degraded' || criticalCheckFailed ? 'degraded' : 'operational';
}

function notConfigured(checkTimestamp: string, error: string): ReoboteSystemsResult {
  return {
    configured: false,
    state: 'not_configured',
    checkedAt: checkTimestamp,
    latencyMs: null,
    error,
    remote: null,
  };
}

function unavailable(
  checkTimestamp: string,
  error: string,
  latencyMs: number | null
): ReoboteSystemsResult {
  return {
    configured: true,
    state: 'unavailable',
    checkedAt: checkTimestamp,
    latencyMs,
    error,
    remote: null,
  };
}

/**
 * Consulta servidor a servidor o endpoint de monitoramento do REOBOTE SISTEMAS.
 * O segredo nunca é devolvido, registrado em log ou enviado ao navegador.
 */
export async function checkReoboteSystems(
  options: CheckReoboteSystemsOptions = {}
): Promise<ReoboteSystemsResult> {
  const checkTimestamp = new Date().toISOString();
  const baseUrl = (options.baseUrl ?? process.env.REOBOTE_SYSTEMS_URL ?? '').trim();
  const secret = options.secret ?? process.env.REOBOTE_MONITORING_SECRET ?? '';

  if (!baseUrl || !secret) {
    return notConfigured(
      checkTimestamp,
      'Integração não configurada no servidor (REOBOTE_SYSTEMS_URL / REOBOTE_MONITORING_SECRET).'
    );
  }

  if (secret.length < MIN_SECRET_LENGTH) {
    return notConfigured(
      checkTimestamp,
      'REOBOTE_MONITORING_SECRET inválido: use pelo menos 32 caracteres.'
    );
  }

  let endpoint: URL;
  try {
    endpoint = new URL('/api/monitoring/status', baseUrl);
  } catch {
    return notConfigured(checkTimestamp, 'REOBOTE_SYSTEMS_URL inválida.');
  }

  if (endpoint.protocol !== 'https:' && !isLoopbackHost(endpoint.hostname)) {
    return notConfigured(checkTimestamp, 'REOBOTE_SYSTEMS_URL deve usar HTTPS.');
  }

  const requestedTimeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutMs = Math.max(50, Math.min(requestedTimeout, 20_000));
  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetchImpl(endpoint, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-monitoring-secret': secret,
        'user-agent': 'ReoboteSuporte/1.0 (monitoring-integration)',
      },
      signal: controller.signal,
      redirect: 'error',
    });

    const latencyMs = Date.now() - startedAt;

    if (response.status === 401 || response.status === 403) {
      return unavailable(
        checkTimestamp,
        'Credencial de monitoramento recusada pelo REOBOTE SISTEMAS.',
        latencyMs
      );
    }

    if (!response.ok) {
      return unavailable(
        checkTimestamp,
        `REOBOTE SISTEMAS respondeu HTTP ${response.status}.`,
        latencyMs
      );
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
      return unavailable(
        checkTimestamp,
        'Resposta do REOBOTE SISTEMAS excedeu o tamanho permitido.',
        latencyMs
      );
    }

    const body = await response.text();
    if (body.length > MAX_RESPONSE_BYTES) {
      return unavailable(
        checkTimestamp,
        'Resposta do REOBOTE SISTEMAS excedeu o tamanho permitido.',
        latencyMs
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      return unavailable(
        checkTimestamp,
        'Resposta inválida do REOBOTE SISTEMAS (JSON malformado).',
        latencyMs
      );
    }

    const remote = normalizeRemoteMonitoringPayload(parsed);
    if (!remote) {
      return unavailable(
        checkTimestamp,
        'Resposta inválida do REOBOTE SISTEMAS (formato inesperado).',
        latencyMs
      );
    }

    return {
      configured: true,
      state: normalizeState(remote),
      checkedAt: checkTimestamp,
      latencyMs,
      error: null,
      remote,
    };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const timedOut =
      controller.signal.aborted ||
      (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError'));

    return unavailable(
      checkTimestamp,
      timedOut
        ? `Tempo esgotado ao consultar o REOBOTE SISTEMAS (${timeoutMs} ms).`
        : 'Não foi possível conectar ao REOBOTE SISTEMAS.',
      latencyMs
    );
  } finally {
    clearTimeout(timer);
  }
}
