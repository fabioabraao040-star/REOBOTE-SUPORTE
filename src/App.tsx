import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Login } from './components/Login';
import { DashboardView } from './components/DashboardView';
import { ServicesView } from './components/ServicesView';
import { IncidentsView } from './components/IncidentsView';
import { LogsView } from './components/LogsView';
import { SettingsView } from './components/SettingsView';
import { ResetPassword } from './components/ResetPassword';

import { initialSettings } from './lib/mockData';
import { MonitoredService, Incident, SystemLog, IntegrationSettings, User } from './types';
import { getSupabase } from './lib/supabase';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  
  const [services, setServices] = useState<MonitoredService[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [settings, setSettings] = useState<IntegrationSettings>(initialSettings);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Sincroniza os indicadores do menu com o estado real do backend.
  // Antes, Supabase/Telegram apareciam sempre "pendentes" porque o objeto
  // settings nunca era atualizado depois do carregamento inicial.
  useEffect(() => {
    let active = true;

    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('health'))))
      .then((data) => {
        if (!active) return;
        setSettings((prev) => ({
          ...prev,
          supabaseConnected: Boolean(data.supabaseConfigured),
          telegramConnected: Boolean(data.telegramConfigured)
        }));
      })
      .catch(() => {
        // Sem backend disponível, mantém os indicadores como estão.
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    let active = true;

    // Link de recuperação do Supabase: o hash contém type=recovery.
    // Sem esta tela o usuário entrava logado e não conseguia definir a senha.
    if (window.location.hash.includes('type=recovery')) {
      setRecoveryMode(true);
    }

    const applySessionUser = (authUser: import('@supabase/supabase-js').User | null) => {
      if (!active) return;

      if (!authUser) {
        setUser(null);
        return;
      }

      const appRole = authUser.app_metadata?.role;
      const role = appRole === 'admin' || appRole === 'operator' || appRole === 'viewer'
        ? appRole
        : 'viewer';

      setUser({
        id: authUser.id,
        email: authUser.email || '',
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário',
        role,
        status: 'active'
      });
    };

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error('Falha ao recuperar sessão:', error);
      applySessionUser(data.session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
      }
      applySessionUser(session?.user || null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async (userId: string) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase não configurado.');

    const [servicesResult, incidentsResult, logsResult] = await Promise.all([
      supabase.from('monitored_services').select('*').eq('owner_id', userId).order('created_at', { ascending: false }),
      supabase.from('support_incidents').select('*').eq('owner_id', userId).order('created_at', { ascending: false }),
      supabase.from('support_logs').select('*').eq('owner_id', userId).order('created_at', { ascending: false })
    ]);

    if (servicesResult.error) throw servicesResult.error;
    if (incidentsResult.error) throw incidentsResult.error;
    if (logsResult.error) throw logsResult.error;

    const serviceRows = servicesResult.data || [];
    const serviceNames = new Map(serviceRows.map((row: any) => [row.id, row.name]));

    setServices(serviceRows.map((row: any) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      status: row.status,
      lastChecked: row.last_checked ? new Date(row.last_checked).toLocaleString('pt-BR') : 'Nunca verificado',
      endpoint: row.endpoint
    })));

    setIncidents((incidentsResult.data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      serviceId: row.service_id || '',
      serviceName: serviceNames.get(row.service_id) || 'Serviço não identificado',
      severity: row.severity,
      status: row.status,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at || undefined,
      telegramSent: Boolean(row.telegram_sent)
    })));

    setLogs((logsResult.data || []).map((row: any) => ({
      id: row.id,
      timestamp: row.created_at,
      origin: row.origin,
      severity: row.severity,
      message: row.message,
      resolved: Boolean(row.resolved)
    })));
  };

  useEffect(() => {
    if (!user?.id) {
      setServices([]);
      setIncidents([]);
      setLogs([]);
      return;
    }

    let active = true;
    loadData(user.id).catch((error: unknown) => {
      if (active) {
        console.error('Falha ao carregar dados do Supabase:', error);
        showToast('error', 'Não foi possível carregar os dados do banco. Verifique as tabelas e permissões RLS.');
      }
    });

    return () => { active = false; };
  }, [user?.id]);

  const handleRefreshData = async () => {
    if (!user?.id) {
      showToast('error', 'Entre no sistema para atualizar os dados.');
      return;
    }

    setIsRefreshing(true);
    try {
      await loadData(user.id);
      showToast('success', 'Dados carregados do Supabase.');
    } catch (error) {
      console.error('Falha ao atualizar dados:', error);
      showToast('error', 'Falha ao atualizar dados do Supabase.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Supabase não configurado.');
    }

    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) {
      throw new Error('Sessão ausente ou expirada. Entre novamente.');
    }

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`
    };
  };

  const sendTelegramAlert = async (incident: Incident): Promise<boolean> => {
    try {
      const response = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          message: `Incidente: *${incident.title}*\n${incident.description}`,
          severity: incident.severity,
          serviceName: incident.serviceName
        })
      });

      const result = await response.json().catch(() => null);
      return Boolean(response.ok && result?.success);
    } catch (error) {
      console.error('Falha ao enviar alerta ao Telegram:', error);
      return false;
    }
  };

  const markIncidentTelegramSent = async (id: string) => {
    if (!user?.id) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase
      .from('support_incidents')
      .update({ telegram_sent: true })
      .eq('id', id)
      .eq('owner_id', user.id);

    if (!error) {
      setIncidents((current) =>
        current.map((i) => (i.id === id ? { ...i, telegramSent: true } : i))
      );
    }
  };

  const handleTestTelegram = async () => {
    try {
      showToast('info', 'Enviando teste via Telegram Bot...');
      const res = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          message: '🚨 Teste de alerta automático via REOBOTE SUPORTE!',
          severity: 'critical',
          serviceName: 'Telegram Bot'
        })
      });
      const data = await res.json().catch(() => null);
      if (data?.success) {
        showToast('success', 'Mensagem enviada com sucesso no Telegram!');
      } else {
        showToast('error', data?.error || 'Erro ao enviar Telegram.');
      }
    } catch (err: unknown) {
      showToast('error', 'Falha ao enviar o teste do Telegram. Verifique a API e as configurações.');
    }
  };

  const handleSendTelegramAlert = async (incident: Incident) => {
    const sent = await sendTelegramAlert(incident);

    if (!sent) {
      showToast('error', 'Não foi possível confirmar o envio do alerta ao Telegram.');
      return;
    }

    showToast('success', 'Alerta enviado ao Telegram!');
    await markIncidentTelegramSent(incident.id);
  };

  const handleAddService = async (newSrv: MonitoredService) => {
    if (!user?.id) return showToast('error', 'Faça login antes de adicionar um serviço.');
    const supabase = getSupabase();
    if (!supabase) return showToast('error', 'Supabase não configurado.');

    const { data, error } = await supabase.from('monitored_services').insert({
      owner_id: user.id,
      name: newSrv.name,
      category: newSrv.category,
      endpoint: newSrv.endpoint,
      status: newSrv.status,
      last_checked: new Date().toISOString()
    }).select().single();

    if (error) {
      console.error('Falha ao salvar serviço:', error);
      return showToast('error', 'Não foi possível salvar o serviço no banco.');
    }

    setServices(current => [{
      id: data.id,
      name: data.name,
      category: data.category,
      status: data.status,
      lastChecked: data.last_checked ? new Date(data.last_checked).toLocaleString('pt-BR') : 'Nunca verificado',
      endpoint: data.endpoint
    }, ...current]);
    showToast('success', 'Serviço salvo no Supabase.');
  };

  const persistServiceStatus = async (
    id: string,
    status: MonitoredService['status'],
    notify = true
  ): Promise<boolean> => {
    if (!user?.id) {
      if (notify) showToast('error', 'Entre no sistema para atualizar o serviço.');
      return false;
    }

    const supabase = getSupabase();
    if (!supabase) {
      if (notify) showToast('error', 'Supabase não configurado.');
      return false;
    }

    const checkedAt = new Date().toISOString();
    const { error } = await supabase.from('monitored_services')
      .update({ status, last_checked: checkedAt })
      .eq('id', id).eq('owner_id', user.id);

    if (error) {
      console.error('Falha ao atualizar serviço:', error);
      if (notify) showToast('error', 'Não foi possível atualizar o serviço no banco.');
      return false;
    }

    setServices(current => current.map(s => s.id === id
      ? { ...s, status, lastChecked: new Date(checkedAt).toLocaleString('pt-BR') }
      : s));

    if (notify) showToast('success', 'Status salvo no Supabase.');
    return true;
  };

  const handleUpdateServiceStatus = (id: string, status: MonitoredService['status']) => {
    void persistServiceStatus(id, status);
  };

  const handleTestService = async (service: MonitoredService) => {
    try {
      const response = await fetch('/api/check-service', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ url: service.endpoint })
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || 'Falha ao testar a conexão.');
      }

      const nextStatus: MonitoredService['status'] = result?.ok ? 'healthy' : 'down';
      await persistServiceStatus(service.id, nextStatus, false);

      showToast(
        result?.ok ? 'success' : 'error',
        result?.ok
          ? `Conexão OK com ${service.name} (HTTP ${result.status}).`
          : `${service.name} não respondeu (HTTP ${result.status || 'sem resposta'}).`
      );
    } catch (error) {
      console.error('Falha no teste de conexão:', error);
      showToast('error', error instanceof Error ? error.message : 'Falha ao testar a conexão.');
    }
  };

  const handleCreateIncident = async (newInc: Incident, notifyTelegram: boolean) => {
    if (!user?.id) return showToast('error', 'Faça login antes de registrar um incidente.');
    const supabase = getSupabase();
    if (!supabase) return showToast('error', 'Supabase não configurado.');

    const { data, error } = await supabase.from('support_incidents').insert({
      owner_id: user.id,
      service_id: newInc.serviceId || null,
      title: newInc.title,
      description: newInc.description,
      severity: newInc.severity,
      status: newInc.status,
      telegram_sent: false
    }).select().single();

    if (error || !data) {
      console.error('Falha ao salvar incidente:', error);
      return showToast('error', 'Não foi possível salvar o incidente no banco.');
    }

    const saved: Incident = {
      ...newInc,
      id: data.id,
      serviceId: data.service_id || '',
      createdAt: data.created_at,
      telegramSent: false
    };

    setIncidents(current => [saved, ...current]);
    showToast('success', 'Incidente salvo no Supabase.');

    if (!notifyTelegram) return;

    // Só marca telegram_sent no banco depois que o envio for confirmado.
    const sent = await sendTelegramAlert(saved);
    if (sent) {
      await markIncidentTelegramSent(saved.id);
      showToast('success', 'Incidente registrado e alerta enviado ao Telegram.');
    } else {
      showToast('error', 'Incidente salvo, mas o alerta do Telegram falhou.');
    }
  };

  const handleUpdateIncidentStatus = async (id: string, status: Incident['status']) => {
    if (!user?.id) return;
    const supabase = getSupabase();
    if (!supabase) return showToast('error', 'Supabase não configurado.');

    const resolvedAt = status === 'resolved' ? new Date().toISOString() : null;
    const { error } = await supabase.from('support_incidents')
      .update({ status, resolved_at: resolvedAt })
      .eq('id', id).eq('owner_id', user.id);

    if (error) {
      console.error('Falha ao atualizar incidente:', error);
      return showToast('error', 'Não foi possível atualizar o incidente no banco.');
    }

    setIncidents(current => current.map(i => i.id === id
      ? { ...i, status, resolvedAt: resolvedAt || undefined }
      : i));
    showToast('success', 'Incidente atualizado no Supabase.');
  };

  const handleClearLogs = async () => {
    if (!user?.id) return;
    const supabase = getSupabase();
    if (!supabase) return showToast('error', 'Supabase não configurado.');

    const { error } = await supabase.from('support_logs')
      .delete().eq('owner_id', user.id).eq('resolved', true);

    if (error) {
      console.error('Falha ao limpar logs:', error);
      return showToast('error', 'Não foi possível limpar os logs resolvidos.');
    }

    setLogs(current => current.filter(log => !log.resolved));
    showToast('success', 'Logs resolvidos removidos do Supabase.');
  };

  const handleResolveLog = async (id: string) => {
    if (!user?.id) return;
    const supabase = getSupabase();
    if (!supabase) return showToast('error', 'Supabase não configurado.');

    const { error } = await supabase.from('support_logs')
      .update({ resolved: true }).eq('id', id).eq('owner_id', user.id);

    if (error) {
      console.error('Falha ao resolver log:', error);
      return showToast('error', 'Não foi possível atualizar o log.');
    }

    setLogs(current => current.map(log => log.id === id ? { ...log, resolved: true } : log));
    showToast('success', 'Log atualizado no Supabase.');
  };

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'Dashboard Principal';
      case 'services': return 'Serviços Supabase & Vercel';
      case 'incidents': return 'Gerenciamento de Incidentes';
      case 'logs': return 'Logs e Auditoria';
      case 'settings': return 'Configurações e Integrações';
      default: return 'REOBOTE SUPORTE';
    }
  };

  if (recoveryMode) {
    return (
      <ResetPassword
        onDone={() => {
          setRecoveryMode(false);
          setUser(null);
        }}
      />
    );
  }

  if (!user) {
    return <Login onLogin={(u) => { setUser(u); showToast('success', `Bem-vindo, ${u.name}!`); }} />;
  }

  return (
    <div className="flex h-screen bg-[#0F172A] text-[#F8FAFC] overflow-hidden font-sans">
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        user={user} 
        onLogout={() => { void getSupabase()?.auth.signOut(); setUser(null); }} 
        settings={settings}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar 
          currentTabTitle={getTabTitle(currentTab)} 
          services={services}
          incidents={incidents}
          onTestTelegram={handleTestTelegram}
          onRefreshData={handleRefreshData}
          isRefreshing={isRefreshing}
        />

        {toastMessage && (
          <div className={`mx-6 mt-4 p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xl z-50 ${
            toastMessage.type === 'success' ? 'bg-[#16A34A]/20 border border-[#16A34A]/40 text-[#16A34A]' :
            toastMessage.type === 'error' ? 'bg-[#DC2626]/20 border border-[#DC2626]/40 text-[#DC2626]' :
            'bg-[#2563EB]/20 border border-[#2563EB]/40 text-[#2563EB]'
          }`}>
            <span>{toastMessage.text}</span>
            <button onClick={() => setToastMessage(null)} className="font-bold ml-4">✕</button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-6">
          {currentTab === 'dashboard' && (
            <DashboardView 
              services={services}
              incidents={incidents}
              logs={logs}
              settings={settings}
              onNavigate={setCurrentTab}
              onTestTelegram={handleTestTelegram}
              onOpenNewIncident={() => setCurrentTab('incidents')}
            />
          )}

          {currentTab === 'services' && (
            <ServicesView 
              services={services}
              onAddService={handleAddService}
              onUpdateServiceStatus={handleUpdateServiceStatus}
              onTestService={handleTestService}
            />
          )}

          {currentTab === 'incidents' && (
            <IncidentsView 
              incidents={incidents}
              services={services}
              onCreateIncident={handleCreateIncident}
              onUpdateIncidentStatus={handleUpdateIncidentStatus}
              onSendTelegramAlert={handleSendTelegramAlert}
            />
          )}

          {currentTab === 'logs' && (
            <LogsView 
              logs={logs}
              onClearLogs={handleClearLogs}
              onResolveLog={handleResolveLog}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView currentUser={user} />
          )}
        </main>
      </div>
    </div>
  );
}
