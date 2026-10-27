import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type {
  AutomaticAlertTestResult,
  IntegrationSecurityResult,
  SupabaseConnectivityResult,
  TelegramTestResult,
  TestFeedback,
  TestFeedbackStatus,
} from '../types';

interface IntegrationTestsPanelProps {
  canRun: boolean;
  telegramTest: TestFeedback<TelegramTestResult>;
  supabaseTest: TestFeedback<SupabaseConnectivityResult>;
  automaticAlertTest: TestFeedback<AutomaticAlertTestResult>;
  securityTest: TestFeedback<IntegrationSecurityResult>;
  onTestTelegram: () => void;
  onTestSupabase: () => void;
  onTestAutomaticAlert: () => void;
  onTestIntegrationSecurity: () => void;
}

interface TestCardProps<T> {
  testId: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  buttonLabel: string;
  feedback: TestFeedback<T>;
  canRun: boolean;
  onRun: () => void;
  renderDetails: (result: T) => React.ReactNode;
}

const feedbackTone: Record<TestFeedbackStatus, string> = {
  idle: 'bg-slate-900/60 border-slate-800 text-slate-400',
  running: 'bg-[#2563EB]/10 border-[#2563EB]/30 text-[#2563EB]',
  success: 'bg-[#16A34A]/10 border-[#16A34A]/30 text-[#16A34A]',
  warning: 'bg-[#EAB308]/10 border-[#EAB308]/30 text-[#EAB308]',
  error: 'bg-[#DC2626]/10 border-[#DC2626]/30 text-[#DC2626]',
};

const feedbackLabels: Record<TestFeedbackStatus, string> = {
  idle: 'Nunca executado',
  running: 'Executando...',
  success: 'Concluído com sucesso',
  warning: 'Concluído com alerta',
  error: 'Falhou',
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString('pt-BR') : '—';
}

function checkTone(passed: boolean): string {
  return passed
    ? 'bg-[#16A34A]/10 border-[#16A34A]/30 text-[#16A34A]'
    : 'bg-[#DC2626]/10 border-[#DC2626]/30 text-[#DC2626]';
}

function probeTone(status: string): string {
  if (status === 'operational') {
    return 'bg-[#16A34A]/10 border-[#16A34A]/30 text-[#16A34A]';
  }
  if (status === 'degraded') {
    return 'bg-[#EAB308]/10 border-[#EAB308]/30 text-[#EAB308]';
  }
  return 'bg-[#DC2626]/10 border-[#DC2626]/30 text-[#DC2626]';
}

function probeLabel(status: string): string {
  switch (status) {
    case 'operational':
      return 'Operacional';
    case 'degraded':
      return 'Degradado';
    case 'unavailable':
      return 'Indisponível';
    default:
      return status;
  }
}

function FeedbackIcon({ status }: { status: TestFeedbackStatus }) {
  if (status === 'success') return <CheckCircle2 className="w-4 h-4" />;
  if (status === 'warning') return <AlertTriangle className="w-4 h-4" />;
  if (status === 'error') return <XCircle className="w-4 h-4" />;
  if (status === 'running') return <RefreshCw className="w-4 h-4 animate-spin" />;
  return <Clock className="w-4 h-4" />;
}

function TestCard<T>({
  testId,
  title,
  description,
  icon,
  buttonLabel,
  feedback,
  canRun,
  onRun,
  renderDetails,
}: TestCardProps<T>) {
  const running = feedback.status === 'running';
  const disabled = running || !canRun;

  return (
    <article className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#2563EB]/15 border border-[#2563EB]/30 text-[#2563EB] flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h4 className="text-sm font-bold text-[#F8FAFC]">{title}</h4>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{description}</p>
        </div>
      </div>

      <button
        type="button"
        data-testid={testId}
        onClick={onRun}
        disabled={disabled}
        aria-busy={running}
        className="w-full py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#2563EB]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
        <span>{running ? 'Testando...' : buttonLabel}</span>
      </button>

      {feedback.status !== 'idle' && (
        <div className={`p-3 rounded-xl border text-xs ${feedbackTone[feedback.status]}`}>
          <div className="flex items-center gap-1.5 font-semibold">
            <FeedbackIcon status={feedback.status} />
            <span>{feedbackLabels[feedback.status]}</span>
          </div>

          {feedback.error && (
            <p className="mt-2 text-slate-300 leading-relaxed">{feedback.error}</p>
          )}

          {feedback.result && (
            <div className="mt-2 text-slate-300">{renderDetails(feedback.result)}</div>
          )}

          {feedback.checkedAt && (
            <p className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Última verificação: {formatDate(feedback.checkedAt)}
            </p>
          )}
        </div>
      )}

      {feedback.status === 'idle' && (
        <p className="text-[10px] text-slate-500">Ainda não executado.</p>
      )}
    </article>
  );
}

function SupabaseDetails({ result }: { result: SupabaseConnectivityResult }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <span className={`px-2 py-1 rounded-lg border text-[10px] font-semibold ${probeTone(result.checks.database.status)}`}>
          Banco/REST: {probeLabel(result.checks.database.status)}
          {result.checks.database.httpStatus !== null
            ? ` (HTTP ${result.checks.database.httpStatus})`
            : ''}
        </span>
        <span className={`px-2 py-1 rounded-lg border text-[10px] font-semibold ${probeTone(result.checks.auth.status)}`}>
          Auth: {probeLabel(result.checks.auth.status)}
          {result.checks.auth.httpStatus !== null
            ? ` (HTTP ${result.checks.auth.httpStatus})`
            : ''}
        </span>
      </div>
      <p className="text-[10px] text-slate-500">
        Latência total: {result.latencyMs !== null ? `${result.latencyMs} ms` : '—'}
      </p>
    </div>
  );
}

function SecurityDetails({ result }: { result: IntegrationSecurityResult }) {
  const withoutStatus = result.checks.withoutCredential.status;
  const invalidStatus = result.checks.invalidCredential.status;

  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={`px-2 py-1 rounded-lg border text-[10px] font-semibold ${checkTone(result.checks.withoutCredential.passed)}`}>
        Sem credencial: {withoutStatus ?? 'sem resposta'} ·{' '}
        {result.checks.withoutCredential.passed ? 'rejeitada' : 'não rejeitada'}
      </span>
      <span className={`px-2 py-1 rounded-lg border text-[10px] font-semibold ${checkTone(result.checks.invalidCredential.passed)}`}>
        Credencial inválida: {invalidStatus ?? 'sem resposta'} ·{' '}
        {result.checks.invalidCredential.passed ? 'rejeitada' : 'não rejeitada'}
      </span>
    </div>
  );
}

function TelegramDetails({ result }: { result: TelegramTestResult }) {
  return (
    <p className="text-[10px] leading-relaxed">
      Mensagem de teste processada pelo endpoint real do Telegram.
      {result.success ? ' Envio confirmado.' : ' Envio não confirmado.'} Nenhum incidente
      ou serviço foi alterado.
    </p>
  );
}

function AlertDetails({ result }: { result: AutomaticAlertTestResult }) {
  return (
    <p className="text-[10px] leading-relaxed">
      Evento [TESTE] entregue ao Telegram.
      {result.testId ? ` ID: ${result.testId}.` : ''} Nenhum incidente ou serviço foi
      alterado.
    </p>
  );
}

export const IntegrationTestsPanel: React.FC<IntegrationTestsPanelProps> = ({
  canRun,
  telegramTest,
  supabaseTest,
  automaticAlertTest,
  securityTest,
  onTestTelegram,
  onTestSupabase,
  onTestAutomaticAlert,
  onTestIntegrationSecurity,
}) => (
  <section
    data-testid="integration-tests-panel"
    className="p-5 rounded-3xl bg-[#1E293B] border border-[#2563EB]/30 space-y-4"
  >
    <div>
      <h3 className="text-base font-black text-[#F8FAFC]">Testes controlados</h3>
      <p className="text-xs text-slate-400 mt-0.5">
        Cada botão executa uma verificação real no servidor e mostra o resultado e o
        horário. Nenhum teste derruba serviços, cria incidentes ou altera o banco.
      </p>
    </div>

    {!canRun && (
      <div className="p-3 rounded-xl bg-[#EAB308]/10 border border-[#EAB308]/30 text-xs text-[#EAB308]">
        Somente perfis admin e operador podem executar estes testes.
      </div>
    )}

    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      <TestCard
        testId="test-telegram"
        title="Telegram"
        description="Envia uma mensagem real pelo botão existente, sem criar incidente ou alterar serviços."
        icon={<MessageCircle className="w-4 h-4" />}
        buttonLabel="Testar Telegram"
        feedback={telegramTest}
        canRun={canRun}
        onRun={onTestTelegram}
        renderDetails={(result) => <TelegramDetails result={result} />}
      />

      <TestCard
        testId="test-supabase"
        title="Supabase"
        description="Consulta real ao PostgREST e à saúde do Auth. Não retorna linhas, URL ou chave."
        icon={<Database className="w-4 h-4" />}
        buttonLabel="Testar Supabase"
        feedback={supabaseTest}
        canRun={canRun}
        onRun={onTestSupabase}
        renderDetails={(result) => <SupabaseDetails result={result} />}
      />

      <TestCard
        testId="test-automatic-alert"
        title="Alerta automático"
        description="Envia uma mensagem real ao Telegram marcada como [TESTE], sem afetar serviços reais."
        icon={<Send className="w-4 h-4" />}
        buttonLabel="Testar alerta automático"
        feedback={automaticAlertTest}
        canRun={canRun}
        onRun={onTestAutomaticAlert}
        renderDetails={(result) => <AlertDetails result={result} />}
      />

      <TestCard
        testId="test-integration-security"
        title="Segurança da integração"
        description="Testa se o REOBOTE SISTEMAS rejeita chamadas sem credencial e com credencial inválida."
        icon={<ShieldCheck className="w-4 h-4" />}
        buttonLabel="Testar segurança da integração"
        feedback={securityTest}
        canRun={canRun}
        onRun={onTestIntegrationSecurity}
        renderDetails={(result) => <SecurityDetails result={result} />}
      />
    </div>
  </section>
);
