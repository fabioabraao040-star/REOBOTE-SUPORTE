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
