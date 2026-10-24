import React, { useState } from 'react';
import { FileText, Search, Trash2, CheckCircle2 } from 'lucide-react';
import { SystemLog } from '../types';

interface LogsViewProps {
  logs: SystemLog[];
  onClearLogs: () => void;
  onResolveLog: (id: string) => void;
}

export const LogsView: React.FC<LogsViewProps> = ({ logs, onClearLogs, onResolveLog }) => {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(search.toLowerCase()) || log.origin.toLowerCase().includes(search.toLowerCase());
    const matchesSev = severityFilter === 'all' || log.severity === severityFilter;
    return matchesSearch && matchesSev;
  });

  const severityBadges = {
    critical: 'bg-[#DC2626]/20 text-[#DC2626] border-[#DC2626]/40',
    error: 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/30',
    warn: 'bg-[#EAB308]/20 text-[#EAB308] border-[#EAB308]/40',
    info: 'bg-[#0891B2]/20 text-[#0891B2] border-[#0891B2]/40'
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#F8FAFC]">Logs e Auditoria do Sistema</h2>
          <p className="text-xs text-slate-400 mt-0.5">Histórico de erros e eventos registrados pelas APIs e banco de dados.</p>
        </div>

        <button
          onClick={onClearLogs}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all border border-slate-700 flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4 text-[#DC2626]" />
          <span>Limpar Resolvidos</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#1E293B] p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nos logs..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 pl-10 text-xs text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#2563EB]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['all', 'critical', 'error', 'warn', 'info'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium uppercase tracking-wider transition-all whitespace-nowrap ${
                severityFilter === sev
                  ? 'bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/30'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-700/60'
              }`}
            >
              {sev === 'all' ? 'Todos' : sev}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#1E293B] border border-slate-800 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="p-4">Gravidade</th>
                <th className="p-4">Origem</th>
                <th className="p-4">Mensagem</th>
                <th className="p-4">Horário</th>
                <th className="p-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Nenhum log encontrado.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${severityBadges[log.severity]}`}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-300">{log.origin}</td>
                    <td className="p-4 text-slate-200">{log.message}</td>
                    <td className="p-4 text-slate-400 whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString('pt-BR')}</td>
                    <td className="p-4 text-right">
                      {log.resolved ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#16A34A]/10 text-[#16A34A] text-[10px] font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Resolvido
                        </span>
                      ) : (
                        <button
                          onClick={() => onResolveLog(log.id)}
                          className="px-3 py-1 rounded-lg bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-medium text-[10px]"
                        >
                          Resolver
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
