import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Database, 
  Send, 
  Activity, 
  Key, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck, 
  Users, 
  Lock
} from 'lucide-react';
import { IntegrationSettings, User } from '../types';

interface SettingsViewProps {
  settings: IntegrationSettings;
  users: User[];
  onAddUser: (user: User) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  users,
  onAddUser
}) => {
  const [activeTab, setActiveTab] = useState<'env' | 'users' | 'sql'>('env');
  const [copiedSql, setCopiedSql] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{
    supabaseConfigured: boolean;
    telegramConfigured: boolean;
    vercel: boolean;
    environment: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setHealthStatus(data);
      })
      .catch(() => {
        setHealthStatus({
          supabaseConfigured: false,
          telegramConfigured: false,
          vercel: false,
          environment: 'development'
        });
      });
  }, []);

  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<User['role']>('operator');

  const sqlSchemaScript = `-- REOBOTE SUPORTE - AUDITORIA SOMENTE LEITURA
-- Este script NAO cria, altera ou apaga tabelas.

-- 1. Conferir as tabelas esperadas pela aplicacao e o estado do RLS.
SELECT
  t.table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM information_schema.tables AS t
JOIN pg_namespace AS n
  ON n.nspname = t.table_schema
JOIN pg_class AS c
  ON c.relnamespace = n.oid
 AND c.relname = t.table_name
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND t.table_name IN (
    'support_profiles',
    'monitored_services',
    'support_incidents',
    'support_logs'
  )
ORDER BY t.table_name;

-- 2. Conferir as politicas RLS dessas tabelas.
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'support_profiles',
    'monitored_services',
    'support_incidents',
    'support_logs'
  )
ORDER BY tablename, policyname;
`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSchemaScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserName) return;
    onAddUser({
      id: `usr-${Date.now()}`,
      email: newUserEmail,
      name: newUserName,
      role: newUserRole,
      status: 'active',
      lastLogin: 'Nunca'
    });
    setNewUserEmail('');
    setNewUserName('');
  };

  const supabaseActive = healthStatus?.supabaseConfigured ?? false;
  const telegramActive = healthStatus?.telegramConfigured ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-[#F8FAFC]">Configurações e Segurança</h2>
        <p className="text-xs text-slate-400 mt-0.5">Gerenciamento seguro via Variáveis de Ambiente na Vercel e Supabase RLS.</p>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'env', label: 'Variáveis de Ambiente (Vercel)', icon: Lock, color: 'text-[#2563EB]' },
          { id: 'sql', label: 'Schema SQL Supabase', icon: Database, color: 'text-[#EAB308]' },
          { id: 'users', label: 'Usuários Administrativos', icon: Users, color: 'text-[#16A34A]' },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/25'
                  : 'bg-[#1E293B] text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.color}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'env' && (
        <div className="p-6 rounded-3xl bg-[#1E293B] border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#F8FAFC]">
              <Lock className="w-4 h-4 text-[#2563EB]" />
              <h3>Status das Variáveis de Ambiente (Backend & Vercel)</h3>
            </div>
          </div>

          {/* Real Status Verification Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-2">
                <Database className="w-4 h-4 text-[#2563EB]" /> Supabase (DB & Auth)
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                supabaseActive ? 'bg-[#16A34A]/20 text-[#16A34A]' : 'bg-[#EAB308]/20 text-[#EAB308]'
              }`}>
                {supabaseActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {supabaseActive ? 'Configurado (nao testado)' : 'Aguardando configuração'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-2">
                <Send className="w-4 h-4 text-[#7C3AED]" /> Telegram Bot
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                telegramActive ? 'bg-[#16A34A]/20 text-[#16A34A]' : 'bg-[#EAB308]/20 text-[#EAB308]'
              }`}>
                {telegramActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {telegramActive ? 'Configurado (nao testado)' : 'Aguardando configuração'}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-slate-300 font-semibold">Variáveis esperadas pelo backend na Vercel:</p>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 font-mono text-xs text-[#0891B2] space-y-1">
              <p>SUPABASE_URL</p>
              <p>SUPABASE_ANON_KEY</p>
              <p>TELEGRAM_BOT_TOKEN</p>
              <p>TELEGRAM_CHAT_ID</p>
            </div>
            <p className="text-[11px] text-slate-400">
              Nota de segurança: A chave <code className="text-slate-200">SUPABASE_SERVICE_ROLE_KEY</code> nunca deve ser exposta no frontend. Tokens e credenciais secretas permanecem estritamente no backend.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'sql' && (
        <div className="p-6 rounded-3xl bg-[#1E293B] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#F8FAFC]">Schema SQL do Supabase</h3>
            <button
              onClick={handleCopySql}
              className="px-4 py-2 bg-[#2563EB] text-white rounded-xl text-xs font-bold"
            >
              {copiedSql ? 'Copiado!' : 'Copiar Script'}
            </button>
          </div>
          <pre className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-[#0891B2] overflow-x-auto max-h-80">
            {sqlSchemaScript}
          </pre>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="p-6 rounded-3xl bg-[#1E293B] border border-slate-800 space-y-6">
          <h3 className="text-sm font-bold text-[#F8FAFC]">Gerenciamento de Usuários Administrativos</h3>
          
          <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <input
              type="text"
              required
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Nome..."
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#2563EB]"
            />
            <input
              type="email"
              required
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="E-mail..."
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#2563EB]"
            />
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as User['role'])}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#2563EB]"
            >
              <option value="admin">Admin</option>
              <option value="operator">Operador</option>
              <option value="viewer">Visualizador</option>
            </select>
            <button
              type="submit"
              className="bg-[#16A34A] text-white font-bold text-xs rounded-xl py-2"
            >
              Adicionar
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase">
                  <th className="p-3">Usuário</th>
                  <th className="p-3">E-mail</th>
                  <th className="p-3">Função</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-semibold text-slate-200">{u.name}</td>
                    <td className="p-3 text-slate-400">{u.email}</td>
                    <td className="p-3 uppercase text-[10px] text-[#2563EB] font-bold">{u.role}</td>
                    <td className="p-3 text-right text-[#16A34A]">Ativo</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
