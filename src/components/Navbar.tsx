import React, { useState } from 'react';
import { Bell, RefreshCw, Send, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Incident, MonitoredService } from '../types';

interface NavbarProps {
  currentTabTitle: string;
  services: MonitoredService[];
  incidents: Incident[];
  onTestTelegram: () => void;
  onRefreshData: () => void;
  isRefreshing: boolean;
  isTestingTelegram?: boolean;
  lastTelegramTestAt?: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTabTitle,
  services,
  incidents,
  onTestTelegram,
  onRefreshData,
  isRefreshing,
  isTestingTelegram = false,
  lastTelegramTestAt = null
}) => {
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  const activeIncidents = incidents.filter((incident) => incident.status !== 'resolved');
  const unhealthyServices = services.filter((service) => service.status !== 'healthy');
  const servicesHealthy = unhealthyServices.length === 0;
  const uptimeLabel =
    services.length === 0
      ? 'Nenhum serviço monitorado'
      : servicesHealthy
        ? 'Todos os sistemas operacionais'
        : `${unhealthyServices.length} serviço(s) com problema`;
  const lastTelegramLabel = lastTelegramTestAt
    ? new Date(lastTelegramTestAt).toLocaleString('pt-BR')
    : 'nenhuma tentativa registrada';

  const severityColor: Record<Incident['severity'], string> = {
    critical: 'text-[#DC2626]',
    major: 'text-[#EA580C]',
    warning: 'text-[#EAB308]'
  };

  return (
    <header className="h-16 bg-[#1E293B] border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold text-[#F8FAFC] tracking-tight">{currentTabTitle}</h2>
        <div
          className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
            servicesHealthy
              ? 'bg-[#16A34A]/10 border-[#16A34A]/30 text-[#16A34A]'
              : 'bg-[#EAB308]/10 border-[#EAB308]/30 text-[#EAB308]'
          }`}
        >
          {servicesHealthy ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          <span>{uptimeLabel}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Telegram Test Button */}
        <button
          data-testid="test-telegram-navbar"
          onClick={onTestTelegram}
          disabled={isTestingTelegram}
          aria-busy={isTestingTelegram}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#7C3AED]/20 border border-[#7C3AED]/40 hover:bg-[#7C3AED]/30 disabled:opacity-60 disabled:cursor-not-allowed text-xs font-medium text-[#7C3AED] transition-all shadow-sm"
          title={`Disparar teste de alerta via Telegram Bot. Última tentativa: ${lastTelegramLabel}`}
        >
          {isTestingTelegram ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">
            {isTestingTelegram ? 'Enviando...' : 'Testar Telegram'}
          </span>
        </button>

        {/* Refresh button */}
        <button
          onClick={onRefreshData}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-all border border-slate-700"
          title="Atualizar dados"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#0891B2] ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotificationModal(!showNotificationModal)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 relative transition-colors border border-slate-700"
            title="Notificações e Alertas"
          >
            <Bell className="w-4 h-4 text-[#EAB308]" />
            {activeIncidents.length > 0 && (
              <>
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#DC2626] animate-ping"></span>
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#DC2626]"></span>
              </>
            )}
          </button>

          {showNotificationModal && (
            <div className="absolute right-0 mt-2 w-80 bg-[#1E293B] border border-slate-700 rounded-2xl shadow-2xl p-4 z-50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-3">
                <span className="font-semibold text-sm text-[#F8FAFC]">Alertas Recentes</span>
                <span className="text-xs px-2 py-0.5 rounded bg-[#DC2626]/20 text-[#DC2626] font-medium">
                  {activeIncidents.length} ativo(s)
                </span>
              </div>

              {activeIncidents.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  Nenhum incidente ativo no momento.
                </p>
              ) : (
                <div className="space-y-2.5 text-xs max-h-64 overflow-y-auto">
                  {activeIncidents.slice(0, 5).map((incident) => (
                    <div
                      key={incident.id}
                      className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60"
                    >
                      <div className="flex items-center justify-between font-semibold mb-1">
                        <span className={severityColor[incident.severity]}>{incident.serviceName}</span>
                        <span className="text-slate-500">
                          {new Date(incident.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-slate-300">{incident.title}</p>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowNotificationModal(false)}
                className="w-full mt-3 py-1.5 bg-[#2563EB] text-white rounded-xl text-xs font-medium hover:bg-[#2563EB]/90 transition-colors"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
