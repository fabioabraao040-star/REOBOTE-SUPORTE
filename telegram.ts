export interface TelegramMessageInput {
  message: string;
  severity?: string;
  serviceName?: string;
  now?: Date;
}

export interface TelegramSendOptions extends TelegramMessageInput {
  token: string;
  chatId: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface TelegramSendResult {
  ok: boolean;
  status: number | null;
  error: string | null;
}

const severityPrefixes: Record<string, string> = {
  critical: '🚨 [CRÍTICO]',
  error: '❌ [ERRO GRAVE]',
  warning: '⚠️ [AVISO]',
  major: '🟠 [INCIDENTE]',
  info: 'ℹ️ [INFO]'
};

export function formatTelegramMessage({
  message,
  severity,
  serviceName,
  now = new Date()
}: TelegramMessageInput): string {
  const prefix =
    typeof severity === 'string' && severityPrefixes[severity]
      ? severityPrefixes[severity]
      : '🔔 [REOBOTE SUPORTE]';

  const safeServiceName =
    typeof serviceName === 'string' ? serviceName.slice(0, 100) : 'Geral';

  return (
    `${prefix}\n\n` +
    `Sistema: REOBOTE SUPORTE\n` +
    `Serviço: ${safeServiceName}\n` +
    `Data: ${now.toLocaleString('pt-BR')}\n\n` +
    message.trim()
  );
}

/**
 * Envia uma mensagem real pelo Telegram. O token nunca é incluído no resultado
 * nem em mensagens de erro; ele só aparece na URL interna da chamada.
 */
export async function sendTelegramMessage({
  token,
  chatId,
  message,
  severity,
  serviceName,
  now,
  timeoutMs = 10000,
  fetchImpl = fetch
}: TelegramSendOptions): Promise<TelegramSendResult> {
  if (!token || !chatId) {
    return {
      ok: false,
      status: null,
      error: 'Telegram não configurado no ambiente do servidor.'
    };
  }

  const text = formatTelegramMessage({ message, severity, serviceName, now });

  try {
    const response = await fetchImpl(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
        signal: AbortSignal.timeout(timeoutMs)
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok || data?.ok !== true) {
      return {
        ok: false,
        status: response.status,
        error: 'O Telegram não confirmou o envio da mensagem.'
      };
    }

    return { ok: true, status: response.status, error: null };
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === 'TimeoutError' || error.name === 'AbortError');

    return {
      ok: false,
      status: null,
      error: timedOut
        ? 'Tempo esgotado ao enviar a mensagem ao Telegram.'
        : 'Falha de conexão com o Telegram.'
    };
  }
}
