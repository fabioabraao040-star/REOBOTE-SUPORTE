import React, { useState } from 'react';
import { ShieldAlert, Lock, Mail, ArrowRight, KeyRound, CheckCircle, AlertCircle, Database, Send, Activity } from 'lucide-react';
import { User } from '../types';
import { getSupabase } from '../lib/supabase';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRecovery, setIsRecovery] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase não configurado. Configure a URL e a chave pública nas integrações.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) throw error;
      if (!data.user) throw new Error('Não foi possível confirmar o usuário.');

      const authUser = data.user;
      const appRole = authUser.app_metadata?.role;
      const role = appRole === 'admin' || appRole === 'operator' || appRole === 'viewer'
        ? appRole
        : 'viewer';

      onLogin({
        id: authUser.id,
        email: authUser.email || email.trim(),
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário',
        role,
        status: 'active',
        lastLogin: new Date().toLocaleString('pt-BR')
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao autenticar. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Informe seu e-mail cadastrado.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase não configurado. Configure a URL e a chave pública.');
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin
      });

      if (error) throw error;
      setRecoverySent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Não foi possível solicitar a recuperação de senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#2563EB]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#7C3AED]/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#1E293B] border border-slate-800 rounded-3xl shadow-2xl p-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#2563EB]/20 border border-[#2563EB]/40 flex items-center justify-center text-[#2563EB] mx-auto mb-4 shadow-xl shadow-[#2563EB]/20">
            <ShieldAlert className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight">REOBOTE SUPORTE</h1>
          <p className="text-xs text-slate-400 mt-1">
            Painel Administrativo & Monitoramento Integrado
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-[#DC2626]/20 border border-[#DC2626]/40 text-[#DC2626] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isRecovery ? (
          <div>
            <div className="mb-6 text-center">
              <h2 className="text-sm font-semibold text-slate-200">Recuperação de Senha (Supabase Auth)</h2>
              <p className="text-xs text-slate-400 mt-1">Enviaremos um link seguro para redefinição de senha para o seu e-mail.</p>
            </div>

            {recoverySent ? (
              <div className="space-y-4 text-center">
                <div className="p-4 rounded-2xl bg-[#16A34A]/20 border border-[#16A34A]/40 text-[#16A34A] text-xs">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-[#16A34A]" />
                  <p className="font-semibold text-sm">E-mail enviado com sucesso!</p>
                  <p className="mt-1 text-slate-300">Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.</p>
                </div>
                <button
                  onClick={() => { setIsRecovery(false); setRecoverySent(false); }}
                  className="w-full py-3 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-[#2563EB]/25"
                >
                  Voltar ao Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecovery} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">E-mail Administrativo</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@reobotesuporte.com"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-3 pl-10 text-sm text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-[#2563EB]/25 flex items-center justify-center gap-2"
                >
                  {loading ? 'Enviando...' : 'Enviar Instruções'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsRecovery(false)}
                  className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Lembrou a senha? Fazer login
                </button>
              </form>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@reobotesuporte.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-3 pl-10 text-sm text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">Senha</label>
                <button
                  type="button"
                  onClick={() => setIsRecovery(true)}
                  className="text-xs text-[#0891B2] hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-3 pl-10 text-sm text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-[#2563EB]/30 flex items-center justify-center gap-2 group"
            >
              <span>{loading ? 'Autenticando...' : 'Acessar Sistema'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        )}

        {/* Integrations Badges */}
        <div className="mt-6 flex items-center justify-center gap-4 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><Database className="w-3 h-3 text-[#2563EB]" /> Supabase Auth</span>
          <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-[#0891B2]" /> Vercel</span>
          <span className="flex items-center gap-1"><Send className="w-3 h-3 text-[#7C3AED]" /> Telegram</span>
        </div>
      </div>
    </div>
  );
};
