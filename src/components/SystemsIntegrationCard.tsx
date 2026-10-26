import React from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  HelpCircle,
  MessageCircle,
  RefreshCw,
  Server,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { SystemsIntegrationStatus } from '../types';

interface SystemsIntegrationCardProps {
  status: SystemsIntegrationStatus | null;
  checking: boolean;
  onCheck: () => void;
}

const overallStyles: Record<
  SystemsIntegrationStatus['state'],
  { label: string; className: string; icon: React.ReactNode }
> = {
  operational: {
    label: 'Operacional',
    className: 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/30',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  degraded: {
    label: 'Degradação',
    className: 'bg-[#EAB308]/10 text-[#EAB308] border-[#EAB308]/30',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  unavailable: {
    label: 'Indisponível',
    className: 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/30',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  not_configured: {
    label: 'Não configurado',
    className: 'bg-slate-800 text-slate-300 border-slate-700',
    icon: <HelpCircle className="w-3.5 h-3.5" />,
  },
};

function statusTone(status: string): string {
  if (status === 'operational' || status === 'connected') {
    return 'text-[#16A34A] bg-[#16A34A]/10 border-[#16A34A]/30';
  }
  if (status === 'degraded' || status === 'configured') {
    return 'text-[#EAB308] bg-[#EAB308]/10 border-[#EAB308]/30';
  }
  if (status === 'unavailable') {
    return 'text-[#DC2626] bg-[#DC2626]/10 border-[#DC2626]/30';
  }
  return 'text-slate-400 bg-slate-900 border-slate-700';
}

function statusLabel(status: string): string {
  switch (status) {
    case 'operational':
      return 'Operacional';
    case 'connected':
      return 'Conectado';
    case 'degraded':
      return 'Degradado';
    case 'configured':
      return 'Configurado (não verificado)';
    case 'unavailable':
      return 'Indisponível';
    case 'not_configured':
      return 'Não configurado';
    default:
      return status;
  }
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString('pt-BR') : '—';
}

export const SystemsIntegrationCard: React.FC<SystemsIntegrationCardProps> = ({
  status,
  checking,
  onCheck,
}) => {
  const overall = status ? overallStyles[status.state] : null;

  return (
    <section className="p-5 rounded-3xl bg-[#1E293B] border border-slate-800 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#2563EB]/15 border border-[#2563EB]/30 text-[#2563EB] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-[#F8FAFC]">Integração REOBOTE SISTEMAS</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Consulta servidor a servidor. Nenhum segredo, token ou dado de cliente é
              enviado ao navegador.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {overall && (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${overall.className}`}
            >
              {overall.icon}
              {overall.label}
            </span>
          )}
          <button
            onClick={onCheck}
            disabled={checking}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-xs font-semibold text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#0891B2] ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Verificando...' : 'Verificar agora'}</span>
          </button>
        </div>
      </div>

      {!status && (
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#0891B2]" />
          Aguardando a primeira verificação real da integração...
        </div>
      )}

      {status && status.state === 'not_configured' && (
        <div className="p-4 rounded-2xl bg-[#EAB308]/10 border border-[#EAB308]/30 text-xs text-[#EAB308] space-y-2">
          <p className="font-semibold">Integração ainda não configurada no servidor.</p>
          <p className="text-slate-300">
            Configure as variáveis abaixo na Vercel e faça um novo deploy. O valor do segredo
            deve ser o mesmo nos dois projetos.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <code className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200">
              REOBOTE_SYSTEMS_URL
            </code>
            <code className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200">
              REOBOTE_MONITORING_SECRET
            </code>
          </div>
        </div>
      )}

      {status && status.state !== 'not_configured' && (
        <>
          {status.remote && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-2">
                  <Activity className="w-3.5 h-3.5" />
                  Aplicação
                </div>
                <span
                  className={`inline-flex px-2 py-1 rounded-full text-[10px] font-semibold border ${statusTone(
                    status.remote.checks.application.status
                  )}`}
                >
                  {statusLabel(status.remote.checks.application.status)}
                </span>
                <p className="text-[10px] text-slate-500 mt-2">
                  Uptime:{' '}
                  {status.remote.checks.application.uptimeSeconds !== null
                    ? `${status.remote.checks.application.uptimeSeconds}s`
                    : '—'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-2">
                  <Server className="w-3.5 h-3.5" />
                  API
                </div>
                <span
                  className={`inline-flex px-2 py-1 rounded-full text-[10px] font-semibold border ${statusTone(
                    status.remote.checks.api.status
                  )}`}
                >
                  {statusLabel(status.remote.checks.api.status)}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Endpoint de monitoramento
                </div>
                <span
                  className={`inline-flex px-2 py-1 rounded-full text-[10px] font-semibold border ${statusTone(
                    status.remote.checks.monitoringEndpoint.status
                  )}`}
                >
                  {statusLabel(status.remote.checks.monitoringEndpoint.status)}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-2">
                  <Database className="w-3.5 h-3.5" />
                  Supabase
                </div>
                <span
                  className={`inline-flex px-2 py-1 rounded-full text-[10px] font-semibold border ${statusTone(
                    status.remote.checks.supabase.status
                  )}`}
                >
                  {statusLabel(status.remote.checks.supabase.status)}
                </span>
                <p className="text-[10px] text-slate-500 mt-2">
                  Latência:{' '}
                  {status.remote.checks.supabase.latencyMs !== null
                    ? `${status.remote.checks.supabase.latencyMs} ms`
                    : '—'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-2">
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp
                </div>
                <span
                  className={`inline-flex px-2 py-1 rounded-full text-[10px] font-semibold border ${statusTone(
                    status.remote.checks.whatsapp.status
                  )}`}
                >
                  {statusLabel(status.remote.checks.whatsapp.status)}
                </span>
                <p className="text-[10px] text-slate-500 mt-2">
                  Última verificação: {formatDate(status.remote.checks.whatsapp.lastCheck)}
                </p>
              </div>
            </div>
          )}

          {status.error && (
            <div
              className={`p-4 rounded-2xl text-xs border flex items-start gap-2 ${
                status.state === 'unavailable'
                  ? 'bg-[#DC2626]/10 border-[#DC2626]/30 text-[#DC2626]'
                  : 'bg-[#EAB308]/10 border-[#EAB308]/30 text-[#EAB308]'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{status.error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 border-t border-slate-800 pt-3">
            <span>
              Última verificação: <strong className="text-slate-300">{formatDate(status.checkedAt)}</strong>
            </span>
            <span>
              Latência da consulta:{' '}
              <strong className="text-slate-300">
                {status.latencyMs !== null ? `${status.latencyMs} ms` : '—'}
              </strong>
              {status.remote ? ` · Verificação remota: ${formatDate(status.remote.checkedAt)}` : ''}
            </span>
          </div>
        </>
      )}
    </section>
  );
};
