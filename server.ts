import express from 'express';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(express.json({ limit: '20kb' }));

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabasePublicKey =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseAuth =
  supabaseUrl && supabasePublicKey
    ? createClient(supabaseUrl, supabasePublicKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      })
    : null;

app.get('/api/health', (_req, res) => {
  const telegramConfigured =
    !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_CHAT_ID;

  res.json({
    status: 'healthy',
    system: 'REOBOTE SUPORTE',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    vercel: !!process.env.VERCEL,
    supabaseConfigured: !!supabaseAuth,
    telegramConfigured
  });
});

app.post('/api/telegram/send', async (req, res) => {
  try {
    if (!supabaseAuth) {
      return res.status(503).json({
        success: false,
        error: 'Autenticação do Supabase não configurada no servidor.'
      });
    }

    const authorization = req.header('authorization') || '';
    const match = authorization.match(/^Bearer\s+(\S+)$/i);

    if (!match) {
      return res.status(401).json({
        success: false,
        error: 'Sessão necessária. Entre novamente no sistema.'
      });
    }

    const { data: authData, error: authError } =
      await supabaseAuth.auth.getUser(match[1]);

    if (authError || !authData.user) {
      return res.status(401).json({
        success: false,
        error: 'Sessão inválida ou expirada. Entre novamente.'
      });
    }

    const role = authData.user.app_metadata?.role;
    if (role !== 'admin' && role !== 'operator') {
      return res.status(403).json({
        success: false,
        error: 'Seu perfil não tem permissão para enviar alertas.'
      });
    }

    const { message, severity, serviceName } = req.body ?? {};

    if (typeof message !== 'string' || !message.trim() || message.length > 3000) {
      return res.status(400).json({
        success: false,
        error: 'A mensagem é obrigatória e deve ter até 3000 caracteres.'
      });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN || '';
    const chat = process.env.TELEGRAM_CHAT_ID || '';

    if (!token || !chat) {
      return res.status(503).json({
        success: false,
        error: 'Telegram não configurado no ambiente do servidor.'
      });
    }

    const emojiMap: Record<string, string> = {
      critical: '🚨 [CRÍTICO]',
      error: '❌ [ERRO GRAVE]',
      warning: '⚠️ [AVISO]',
      major: '🟠 [INCIDENTE]',
      info: 'ℹ️ [INFO]'
    };

    const prefix =
      typeof severity === 'string' && emojiMap[severity]
        ? emojiMap[severity]
        : '🔔 [REOBOTE SUPORTE]';

    const safeServiceName =
      typeof serviceName === 'string'
        ? serviceName.slice(0, 100)
        : 'Geral';

    const formattedMessage =
      `${prefix}\n\n` +
      `Sistema: REOBOTE SUPORTE\n` +
      `Serviço: ${safeServiceName}\n` +
      `Data: ${new Date().toLocaleString('pt-BR')}\n\n` +
      message.trim();

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chat,
          text: formattedMessage
        }),
        signal: AbortSignal.timeout(10000)
      }
    );

    const telegramData = await telegramResponse.json().catch(() => null);

    if (!telegramResponse.ok || telegramData?.ok !== true) {
      console.error('Telegram recusou o envio:', telegramResponse.status);
      return res.status(502).json({
        success: false,
        error: 'O Telegram não confirmou o envio da mensagem.'
      });
    }

    return res.json({ success: true, simulated: false });
  } catch (err: unknown) {
    console.error(
      'Falha na rota Telegram:',
      err instanceof Error ? err.message : 'Erro desconhecido'
    );

    return res.status(500).json({
      success: false,
      error: 'Erro interno ao processar o alerta.'
    });
  }
});

export default app;
