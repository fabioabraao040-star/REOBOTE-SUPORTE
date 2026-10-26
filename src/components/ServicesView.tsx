import React, { useState } from 'react';
import { Server, Plus, RefreshCw, CheckCircle2, Search, Database, Activity, Send } from 'lucide-react';
import { MonitoredService } from '../types';

interface ServicesViewProps {
  services: MonitoredService[];
  onAddService: (service: MonitoredService) => void;
  onUpdateServiceStatus: (id: string, status: MonitoredService['status']) => void;
  onTestService: (service: MonitoredService) => Promise<void>;
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  services,
  onAddService,
  onUpdateServiceStatus,
  onTestService
}) => {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<MonitoredService['category']>('supabase');
  const [endpoint, setEndpoint] = useState('');

  const filteredServices = services.filter(srv => 
    srv.name.toLowerCase().includes(search.toLowerCase()) || 
    srv.endpoint.toLowerCase().includes(search.toLowerCase())
  );

  const handleTestPing = async (service: MonitoredService) => {
    setTestingId(service.id);
    try {
      await onTestService(service);
    } finally {
      setTestingId(null);
    }
  };

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !endpoint) return;

    const newSrv: MonitoredService = {
      id: `srv-${Date.now()}`,
      name,
      category,
      status: 'healthy',
      lastChecked: 'Agora mesmo',
      endpoint
    };

    onAddService(newSrv);
    setName('');
    setEndpoint('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#F8FAFC]">Serviços Supabase & Vercel</h2>
          <p className="text-xs text-slate-400 mt-0.5">Monitore os endpoints do banco de dados, autenticação e rotas de API.</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-[#2563EB]/25 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Serviço</span>
        </button>
      </div>

      <div className="flex items-center justify-between bg-[#1E293B] p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar serviço..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 pl-10 text-xs text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#2563EB]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((srv) => {
          const isTesting = testingId === srv.id;
          const statusColors = {
            healthy: 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/30',
            degraded: 'bg-[#EAB308]/10 text-[#EAB308] border-[#EAB308]/30',
            down: 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/30'
          };
          const statusLabels = {
            healthy: 'Saudável',
            degraded: 'Degradado',
            down: 'Fora do Ar'
          };

          return (
            <div key={srv.id} className="p-5 rounded-3xl bg-[#1E293B] border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-slate-300 text-[10px] font-bold uppercase tracking-wider border border-slate-700/60">
                    {srv.category}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColors[srv.status]}`}>
                    {statusLabels[srv.status]}
                  </span>
                </div>

                <h3 className="font-bold text-base text-[#F8FAFC] mb-1">{srv.name}</h3>
                <p className="text-xs text-slate-400 font-mono mb-4 bg-slate-900/60 p-2 rounded-xl border border-slate-800 truncate">
                  {srv.endpoint}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center gap-2">
                <button
                  onClick={() => handleTestPing(srv)}
                  disabled={isTesting}
                  className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#0891B2] ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testando...' : 'Testar Conexão'}</span>
                </button>

                <select
                  value={srv.status}
                  onChange={(e) => onUpdateServiceStatus(srv.id, e.target.value as MonitoredService['status'])}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="healthy">Saudável</option>
                  <option value="degraded">Degradado</option>
                  <option value="down">Fora do Ar</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-[#1E293B] border border-slate-700 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#F8FAFC] mb-4">Adicionar Serviço</h3>
            <form onSubmit={handleCreateService} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Supabase Edge Function"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as MonitoredService['category'])}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="supabase">Supabase</option>
                    <option value="vercel">Vercel</option>
                    <option value="telegram">Telegram</option>
                    <option value="api">API</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Endpoint</label>
                  <input
                    type="text"
                    required
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#2563EB] text-white rounded-xl text-xs font-bold shadow-lg shadow-[#2563EB]/25"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
