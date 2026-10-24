import { MonitoredService, Incident, SystemLog, IntegrationSettings, User } from '../types';

export const initialServices: MonitoredService[] = [
  {
    id: 'srv-supabase',
    name: 'Supabase Database & Auth',
    category: 'supabase',
    status: 'healthy',
    lastChecked: 'Agora mesmo',
    endpoint: '/api/health'
  },
  {
    id: 'srv-vercel',
    name: 'Vercel API Backend',
    category: 'vercel',
    status: 'healthy',
    lastChecked: 'Agora mesmo',
    endpoint: '/api/health'
  },
  {
    id: 'srv-telegram',
    name: 'Telegram Bot Notifier',
    category: 'telegram',
    status: 'healthy',
    lastChecked: 'Agora mesmo',
    endpoint: 'https://api.telegram.org'
  }
];

export const initialIncidents: Incident[] = [];

export const initialLogs: SystemLog[] = [];

export const initialSettings: IntegrationSettings = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  supabaseConnected: false,
  vercelProjectName: 'reobote-suporte',
  vercelConnected: true,
  telegramBotToken: '',
  telegramChatId: '',
  telegramConnected: false
};

export const initialUsers: User[] = [
  {
    id: 'usr-admin',
    email: 'admin@reobotesuporte.com',
    name: 'Administrador REOBOTE',
    role: 'admin',
    status: 'active',
    lastLogin: 'Agora mesmo',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
  }
];
