import React, { useState } from 'react';
import { Bell, RefreshCw, Send, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { IntegrationSettings } from '../types';

interface NavbarProps {
  currentTabTitle: string;
  settings: IntegrationSettings;
  onTestTelegram: () => void;
  onRefreshData: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTabTitle,
  settings,
  onTestTelegram,
  onRefreshData,
  isRefreshing
}) => {
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  return (
    <header className="h-16 bg-[#1E293B] border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold text-[#F8FAFC] tracking-tight">{currentTabTitle}</h2>
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-[#16A34A]/10 border border-[#16A34A]/30 text-xs font-medium text-[#16A34A]">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Todos os sistemas operacionais (99.94% Uptime)</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Telegram Test Button */}
        <button
          onClick={onTestTelegram}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#7C3AED]/20 border border-[#7C3AED]/40 hover:bg-[#7C3AED]/30 text-xs font-medium text-[#7C3AED] transition-all shadow-sm"
          title="Disparar teste de alerta via Telegram Bot"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Testar Telegram</span>
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
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#DC2626] animate-ping"></span>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#DC2626]"></span>
          </button>

          {showNotificationModal && (
            <div className="absolute right-0 mt-2 w-80 bg-[#1E293B] border border-slate-700 rounded-2xl shadow-2xl p-4 z-50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-3">
                <span className="font-semibold text-sm text-[#F8FAFC]">Alertas Recentes</span>
                <span className="text-xs px-2 py-0.5 rounded bg-[#DC2626]/20 text-[#DC2626] font-medium">2 novos</span>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                  <div className="flex items-center justify-between font-semibold text-[#EA580C] mb-1">
                    <span>Supabase Storage</span>
                    <span>Há 45m</span>
                  </div>
                  <p className="text-slate-300">Latência elevada superou 500ms temporariamente.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                  <div className="flex items-center justify-between font-semibold text-[#16A34A] mb-1">
                    <span>Telegram Bot</span>
                    <span>Há 2h</span>
                  </div>
                  <p className="text-slate-300">Webhook reconfigurado e operando normalmente.</p>
                </div>
              </div>
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
