import React, { useState } from 'react';
import { AlertTriangle, Plus, Send, CheckCircle2, Search } from 'lucide-react';
import { Incident, MonitoredService } from '../types';

interface IncidentsViewProps {
  incidents: Incident[];
  services: MonitoredService[];
  onCreateIncident: (incident: Incident) => void;
  onUpdateIncidentStatus: (id: string, status: Incident['status']) => void;
  onSendTelegramAlert: (incident: Incident) => void;
}

export const IncidentsView: React.FC<IncidentsViewProps> = ({
  incidents,
  services,
  onCreateIncident,
  onUpdateIncidentStatus,
  onSendTelegramAlert
}) => {
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [showNewModal, setShowNewModal] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [serviceId, setServiceId] = useState(services[0]?.id || '');
  const [severity, setSeverity] = useState<Incident['severity']>('major');
  const [sendTelegram, setSendTelegram] = useState(true);

  const filteredIncidents = incidents.filter(inc => {
    const matchesSearch = inc.title.toLowerCase().includes(search.toLowerCase()) || inc.serviceName.toLowerCase().includes(search.toLowerCase());
    const matchesSev = filterSeverity === 'all' || inc.severity === filterSeverity;
    return matchesSearch && matchesSev;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    const selectedService = services.find(s => s.id === serviceId);

    const newInc: Incident = {
      id: `inc-${Date.now()}`,
      title,
      description,
      serviceId,
      serviceName: selectedService?.name || 'Supabase / Vercel',
      severity,
      status: 'open',
      createdAt: new Date().toISOString(),
      telegramSent: sendTelegram
    };

    onCreateIncident(newInc);
    if (sendTelegram) {
      onSendTelegramAlert(newInc);
    }

    setTitle('');
    setDescription('');
    setShowNewModal(false);
  };

  const severityColors = {
    critical: 'bg-[#DC2626]/20 text-[#DC2626] border-[#DC2626]/40',
    major: 'bg-[#EA580C]/20 text-[#EA580C] border-[#EA580C]/40',
    warning: 'bg-[#EAB308]/20 text-[#EAB308] border-[#EAB308]/40'
  };

  const statusColors = {
    open: 'bg-[#DC2626]/10 text-[#DC2626]',
    investigating: 'bg-[#EA580C]/10 text-[#EA580C]',
    resolved: 'bg-[#16A34A]/10 text-[#16A34A]'
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#F8FAFC]">Gerenciamento de Incidentes</h2>
          <p className="text-xs text-slate-400 mt-0.5">Registre falhas e envie alertas automáticos via Telegram.</p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2.5 bg-[#EA580C] hover:bg-[#EA580C]/90 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-[#EA580C]/25 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Incidente</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#1E293B] p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar incidentes..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 pl-10 text-xs text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#2563EB]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['all', 'critical', 'major', 'warning'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium uppercase tracking-wider transition-all whitespace-nowrap ${
                filterSeverity === sev
                  ? 'bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/30'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-700/60'
              }`}
            >
              {sev === 'all' ? 'Todas Gravidades' : sev}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredIncidents.length === 0 ? (
          <div className="p-12 text-center bg-[#1E293B] border border-slate-800 rounded-3xl text-slate-400 text-xs">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-[#16A34A]" />
            Nenhum incidente encontrado.
          </div>
        ) : (
          filteredIncidents.map((inc) => (
            <div key={inc.id} className="p-6 rounded-3xl bg-[#1E293B] border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${severityColors[inc.severity]}`}>
                    {inc.severity}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">Serviço: <strong className="text-slate-200">{inc.serviceName}</strong></span>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[inc.status]}`}>
                    Status: {inc.status}
                  </span>
                  <select
                    value={inc.status}
                    onChange={(e) => onUpdateIncidentStatus(inc.id, e.target.value as Incident['status'])}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="open">Aberto</option>
                    <option value="investigating">Investigando</option>
                    <option value="resolved">Resolvido</option>
                  </select>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-[#F8FAFC]">{inc.title}</h3>
                <p className="text-xs text-slate-300 mt-1">{inc.description}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                <span>Criado em {new Date(inc.createdAt).toLocaleString('pt-BR')}</span>
                <button
                  onClick={() => onSendTelegramAlert(inc)}
                  className="flex items-center gap-1.5 text-[#7C3AED] hover:underline font-semibold"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar Alerta Telegram</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showNewModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-[#1E293B] border border-slate-700 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#F8FAFC] mb-4">Registrar Novo Incidente</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Título do Incidente</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Falha de conexão no Supabase"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Serviço Afetado</label>
                  <select
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                  >
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Gravidade</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as Incident['severity'])}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="critical">Crítico</option>
                    <option value="major">Importante</option>
                    <option value="warning">Aviso</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Descrição</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes da falha..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                ></textarea>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendTelegram"
                  checked={sendTelegram}
                  onChange={(e) => setSendTelegram(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-[#7C3AED]"
                />
                <label htmlFor="sendTelegram" className="text-xs text-slate-300">
                  Disparar alerta automático para o Telegram
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#EA580C] text-white rounded-xl text-xs font-bold shadow-lg shadow-[#EA580C]/25"
                >
                  Registrar e Notificar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
