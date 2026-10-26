import React, { useState } from 'react';
import { KeyRound, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { getSupabase } from '../lib/supabase';

interface ResetPasswordProps {
  onDone: () => void;
}

/**
 * Tela exibida quando o usuário chega pelo link de recuperação do Supabase.
 * Sem ela, o link abria o painel logado e não havia como definir a nova senha.
 */
export const ResetPassword: React.FC<ResetPasswordProps> = ({ onDone }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirm) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase não configurado.');
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      // Encerra a sessão de recuperação: o usuário entra de novo com a senha nova.
      await supabase.auth.signOut();
      window.history.replaceState(null, '', window.location.pathname);
      setDone(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível atualizar a senha.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#2563EB]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#7C3AED]/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#1E293B] border border-slate-800 rounded-3xl shadow-2xl p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#2563EB]/20 border border-[#2563EB]/40 flex items-center justify-center text-[#2563EB] mx-auto mb-4 shadow-xl shadow-[#2563EB]/20">
            <KeyRound className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight">
            Definir nova senha
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Escolha uma nova senha para acessar o REOBOTE SUPORTE.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-[#DC2626]/20 border border-[#DC2626]/40 text-[#DC2626] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {done ? (
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-2xl bg-[#16A34A]/20 border border-[#16A34A]/40 text-[#16A34A] text-xs">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
              <p className="font-semibold text-sm">Senha atualizada com sucesso!</p>
              <p className="mt-1 text-slate-300">
                Entre novamente usando a nova senha.
              </p>
            </div>
            <button
              onClick={onDone}
              className="w-full py-3 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-[#2563EB]/25"
            >
              Ir para o login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Nova senha
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-3 text-sm text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Confirmar nova senha
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-3 text-sm text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#2563EB] hover:bg-[#2563EB]/90 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-[#2563EB]/30 flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Salvando...' : 'Salvar nova senha'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onDone}
              className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Voltar ao login
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
