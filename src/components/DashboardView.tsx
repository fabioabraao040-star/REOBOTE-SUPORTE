import React from 'react';
import { Server, AlertTriangle, FileText, CheckCircle2, Send, Database, Activity } from 'lucide-react';
import { MonitoredService, Incident, SystemLog, IntegrationSettings } from '../types';

interface DashboardViewProps {
  services: MonitoredService[];
  incidents: Incident[];
  logs: SystemLog[];
  settings: IntegrationSettings;
  onNavigate: (tab: string) => void;
  onTestTelegram: () => void;
  onOpenNewIncident: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  services,
  incidents,
  logs,
  settings,
  onNavigate,
  onTestTelegram,
  onOpenNewIncident
}) => {
  const openIncidents = incidents.filter(i => i.status === 'open' || i.status === 'investigating');
  const unresolvedErrors = logs.filter(l => !l.resolved && l.severity === 'error');

  const statusDot: Record<MonitoredService['status'], string> = {
    healthy: 'bg-[#16A34A]',
    degraded: 'bg-[#EAB308]',
    down: 'bg-[#DC2626]'
  };
  const statusBadge: Record<MonitoredService['status'], string> = {
    healthy: 'bg-[#16A34A]/10 text-[#16A34A]',
    degraded: 'bg-[#EAB308]/10 text-[#EAB308]',
    down: 'bg-[#DC2626]/10 text-[#DC2626]'
  };
  const statusLabel: Record<MonitoredService['status'], string> = {
    healthy: 'Saudável',
    degraded: 'Degradado',
    down: 'Fora do Ar'
  };
  const healthyCount = services.filter((srv) => srv.status === 'healthy').length;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#1E293B] via-[#1E293B] to-[#2563EB]/15 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#2563EB]/20 border border-[#2563EB]/40 text-[#2563EB] text-xs font-semibold">
              REOBOTE SUPORTE
            </span>
            <span className="text-xs text-slate-400">Vercel & Supabase Integrados</span>
          </div>
          <h2 className="text-2xl font-black text-[#F8FAFC]">Painel Operacional</h2>
          <p className="text-xs text-slate-400 mt-1">
            Monitoramento de serviços, incidentes e alertas via Telegram Bot em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenNewIncident}
            className="px-4 py-2.5 bg-[#EA580C] hover:bg-[#EA580C]/90 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-[#EA580C]/25 flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Novo Incidente</span>
          </button>
          <button
            onClick={onTestTelegram}
            className="px-4 py-2.5 bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-[#7C3AED]/25 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Testar Telegram</span>
          </button>
        </div>
      </div>

      {/* 3 Core Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Services */}
        <div 
          onClick={() => onNavigate('services')}
          className="p-5 rounded-2xl bg-[#1E293B] border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Serviços Monitorados</span>
            <Server className="w-5 h-5 text-[#2563EB]" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-[#F8FAFC]">{services.length}</span>
            <span className={`text-xs font-semibold flex items-center gap-1 ${healthyCount === services.length ? 'text-[#16A34A]' : 'text-[#EAB308]'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" /> {healthyCount}/{services.length} saudáveis
            </span>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">Supabase DB, Vercel API, Telegram Bot</p>
        </div>

        {/* Incidents */}
        <div 
          onClick={() => onNavigate('incidents')}
          className="p-5 rounded-2xl bg-[#1E293B] border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Incidentes Abertos</span>
            <AlertTriangle className="w-5 h-5 text-[#EA580C]" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-[#F8FAFC]">{openIncidents.length}</span>
            <span className="text-xs text-[#EA580C] font-semibold">
              {openIncidents.length > 0 ? 'Em investigação' : 'Nenhum'}
            </span>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            {settings.telegramConnected ? 'Notificações automáticas ativadas' : 'Telegram pendente de configuração'}
          </p>
        </div>

        {/* Telegram Status */}
        <div 
          onClick={() => onNavigate('settings')}
          className="p-5 rounded-2xl bg-[#1E293B] border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Telegram Alertas</span>
            <Send className="w-5 h-5 text-[#7C3AED]" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-[#F8FAFC]">
              {settings.telegramConnected ? 'Configurado' : 'Pendente'}
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${settings.telegramConnected ? 'bg-[#16A34A]' : 'bg-[#EAB308]'}`}></span>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            {settings.telegramConnected
              ? 'Alertas habilitados no servidor'
              : 'Configure TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID'}
          </p>
        </div>
      </div>

      {/* Services & Incidents Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Services List */}
        <div className="p-6 rounded-3xl bg-[#1E293B] border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-[#F8FAFC]">Serviços Supabase & Vercel</h3>
            <button onClick={() => onNavigate('services')} className="text-xs text-[#2563EB] hover:underline font-semibold">Ver detalhes</button>
          </div>
          <div className="space-y-3">
            {services.map(srv => (
              <div key={srv.id} className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${statusDot[srv.status]}`}></span>
                  <div>
                    <h4 className="font-semibold text-xs text-[#F8FAFC]">{srv.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">{srv.endpoint}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${statusBadge[srv.status]}`}>
                  {statusLabel[srv.status]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Active Incidents */}
        <div className="p-6 rounded-3xl bg-[#1E293B] border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-[#F8FAFC]">Incidentes Ativos</h3>
            <button onClick={() => onNavigate('incidents')} className="text-xs text-[#EA580C] hover:underline font-semibold">Ver todos</button>
          </div>
          {openIncidents.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-[#16A34A]" />
              Nenhum incidente ativo no momento.
            </div>
          ) : (
            <div className="space-y-3">
              {openIncidents.map(inc => (
                <div key={inc.id} className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#EA580C]">
                    <span>{inc.serviceName}</span>
                    <span className="uppercase text-[10px] px-2 py-0.5 rounded bg-[#EA580C]/20">{inc.severity}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-200">{inc.title}</h4>
                  <p className="text-[11px] text-slate-400">{inc.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
