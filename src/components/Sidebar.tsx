import React from 'react';
import { 
  LayoutDashboard, 
  Server, 
  AlertTriangle, 
  FileText, 
  Settings, 
  LogOut, 
  ShieldAlert,
  Send,
  Database
} from 'lucide-react';
import { User, IntegrationSettings } from '../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: User | null;
  onLogout: () => void;
  settings: IntegrationSettings;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab, user, onLogout, settings }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-[#0891B2]' },
    { id: 'services', label: 'Serviços Supabase & Vercel', icon: Server, color: 'text-[#2563EB]' },
    { id: 'incidents', label: 'Incidentes', icon: AlertTriangle, color: 'text-[#EA580C]' },
    { id: 'logs', label: 'Logs e Erros', icon: FileText, color: 'text-[#DC2626]' },
    { id: 'settings', label: 'Configurações', icon: Settings, color: 'text-[#7C3AED]' },
  ];

  return (
    <aside className="w-64 bg-[#1E293B] border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2563EB]/20 border border-[#2563EB]/40 flex items-center justify-center text-[#2563EB]">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-[#F8FAFC] tracking-wide text-sm">REOBOTE SUPORTE</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span>
              <span className="text-[10px] font-semibold text-[#16A34A] tracking-wider uppercase">Online</span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium text-xs transition-all duration-200 ${
                  isActive
                    ? 'bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/25 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.color}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Integration Status & User */}
      <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-900/40">
        <div className="text-xs text-slate-400 space-y-1.5">
          <div className="font-semibold text-slate-300 mb-1">Status Supabase / Telegram</div>
          <div className="flex items-center justify-between bg-slate-800/50 px-2.5 py-1.5 rounded-lg border border-slate-700/50">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Database className="w-3.5 h-3.5 text-[#2563EB]" /> Supabase DB
            </span>
            <span className={`w-2 h-2 rounded-full ${settings.supabaseConnected ? 'bg-[#16A34A]' : 'bg-[#EAB308]'}`}></span>
          </div>
          <div className="flex items-center justify-between bg-slate-800/50 px-2.5 py-1.5 rounded-lg border border-slate-700/50">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Send className="w-3.5 h-3.5 text-[#7C3AED]" /> Telegram
            </span>
            <span className={`w-2 h-2 rounded-full ${settings.telegramConnected ? 'bg-[#16A34A]' : 'bg-[#EAB308]'}`}></span>
          </div>
        </div>

        {user && (
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#2563EB]/20 border border-[#2563EB]/40 text-[#2563EB] text-[10px] font-bold flex items-center justify-center shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="overflow-hidden">
                <p className="text-xs font-medium text-slate-200 truncate">{user.name}</p>
                <p className="text-[10px] text-slate-400 uppercase">{user.role}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-[#DC2626] hover:bg-slate-800 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
