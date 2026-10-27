export type Role = 'admin' | 'operator' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: 'active' | 'suspended';
  lastLogin?: string;
  avatar?: string;
}

export type ServiceStatus = 'healthy' | 'degraded' | 'down';

export interface MonitoredService {
  id: string;
  name: string;
  category: 'supabase' | 'vercel' | 'telegram' | 'api';
  status: ServiceStatus;
  lastChecked: string;
  endpoint: string;
}

export type IncidentSeverity = 'critical' | 'major' | 'warning';
export type IncidentStatus = 'open' | 'investigating' | 'resolved';

export interface Incident {
  id: string;
  title: string;
  description: string;
  serviceId: string;
  serviceName: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  createdAt: string;
  resolvedAt?: string;
  telegramSent: boolean;
}

export type LogSeverity = 'critical' | 'error' | 'warn' | 'info';

export interface SystemLog {
  id: string;
  timestamp: string;
  origin: string;
  severity: LogSeverity;
  message: string;
  resolved: boolean;
}

export interface IntegrationSettings {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseConnected: boolean;
  vercelProjectName: string;
  vercelConnected: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  telegramConnected: boolean;
}

export type SystemsIntegrationState =
  | 'operational'
  | 'degraded'
  | 'unavailable'
  | 'not_configured';

export type SystemsRemoteStatus = 'operational' | 'degraded' | 'unavailable';
export type SystemsWhatsAppStatus =
  | 'connected'
  | 'configured'
  | 'not_configured'
  | 'unavailable';

export interface SystemsIntegrationStatus {
  configured: boolean;
  state: SystemsIntegrationState;
  checkedAt: string;
  latencyMs: number | null;
  error: string | null;
  remote: null | {
    service: string;
    status: 'operational' | 'degraded';
    checkedAt: string;
    checks: {
      application: {
        status: SystemsRemoteStatus;
        uptimeSeconds: number | null;
      };
      api: {
        status: SystemsRemoteStatus;
      };
      monitoringEndpoint: {
        status: SystemsRemoteStatus;
      };
      supabase: {
        status: SystemsRemoteStatus;
        latencyMs: number | null;
      };
      whatsapp: {
        status: SystemsWhatsAppStatus;
        lastCheck: string | null;
      };
    };
  };
}

export type SupabaseProbeStatus = 'operational' | 'degraded' | 'unavailable';

export interface SupabaseConnectivityResult {
  configured: boolean;
  state: SupabaseProbeStatus | 'not_configured';
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

export interface AutomaticAlertTestResult {
  success: boolean;
  simulated: false;
  test: true;
  testId?: string;
  checkedAt?: string;
  error?: string;
}

export type TestFeedbackStatus =
  | 'idle'
  | 'running'
  | 'success'
  | 'warning'
  | 'error';

export interface TestFeedback<T> {
  status: TestFeedbackStatus;
  result: T | null;
  error: string | null;
  checkedAt: string | null;
}
