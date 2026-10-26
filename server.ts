import express from 'express';
import type { Request } from 'express';
import dotenv from 'dotenv';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { createClient } from '@supabase/supabase-js';
import { checkReoboteSystems } from './reoboteSystems.js';

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

type AuthResult =
  | { ok: true; user: import('@supabase/supabase-js').User }
  | { ok: false; status: number; error: string };

// Valida o Bearer token do Supabase e devolve o usuário autenticado.
// Reutilizado por todas as rotas de backend que exigem sessão.
async function getAuthenticatedUser(req: Request): Promise<AuthResult> {
  if (!supabaseAuth) {
    return {
      ok: false,
      status: 503,
      error: 'Autenticação do Supabase não configurada no servidor.'
    };
  }

  const authorization = req.header('authorization') || '';
  const match = authorization.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    return {
      ok: false,
      status: 401,
      error: 'Sessão necessária. Entre novamente no sistema.'
    };
  }

  const { data, error } = await supabaseAuth.auth.getUser(match[1]);

  if (error || !data.user) {
    return {
      ok: false,
      status: 401,
      error: 'Sessão inválida ou expirada. Entre novamente.'
    };
  }

  return { ok: true, user: data.user };
}

// Limite simples por usuário (por instância) para a consulta de integração.
// Evita que o painel ou um clique repetido sobrecarregue o REOBOTE SISTEMAS.
const SYSTEMS_CHECK_WINDOW_MS = 60_000;
const SYSTEMS_CHECK_MAX_PER_USER = 30;
const systemsCheckQuota = new Map<string, { count: number; resetAt: number }>();

function consumeSystemsCheckQuota(userId: string): boolean {
  const now = Date.now();

  if (systemsCheckQuota.size > 1000) {
    for (const [key, bucket] of systemsCheckQuota) {
      if (bucket.resetAt <= now) systemsCheckQuota.delete(key);
    }
  }

  const bucket = systemsCheckQuota.get(userId);
  if (!bucket || bucket.resetAt <= now) {
    systemsCheckQuota.set(userId, {
      count: 1,
      resetAt: now + SYSTEMS_CHECK_WINDOW_MS
    });
    return true;
  }

  if (bucket.count >= SYSTEMS_CHECK_MAX_PER_USER) return false;

  bucket.count += 1;
  return true;
}

// Bloqueia faixas privadas/reservadas para evitar SSRF no teste de endpoints.
function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  const value = address.toLowerCase();

  if (version === 4) {
    const [a, b] = value.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast/reservado
    return false;
  }

  if (version === 6) {
    if (value === '::' || value === '::1') return true;
    if (value.startsWith('fc') || value.startsWith('fd')) return true; // ULA
    if (/^fe[89ab]/.test(value)) return true; // link-local
    const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return false;
  }

  // Host que não é IP (já resolvido antes) é tratado como inseguro.
  return true;
}

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
    const auth = await getAuthenticatedUser(req);
    if (!auth.ok) {
      return res.status(auth.status).json({
        success: false,
        error: auth.error
      });
    }

    const role = auth.user.app_metadata?.role;
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

// Teste real de conectividade de um serviço monitorado.
// Roda no servidor para evitar bloqueios de CORS do navegador e valida a URL
// contra SSRF (não permite acessar localhost/redes privadas de terceiros).
app.post('/api/check-service', async (req, res) => {
  const auth = await getAuthenticatedUser(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ ok: false, error: auth.error });
  }

  const rawUrl = req.body?.url;
  if (typeof rawUrl !== 'string' || !rawUrl.trim() || rawUrl.length > 2048) {
    return res.status(400).json({ ok: false, error: 'Endpoint inválido.' });
  }

  const host = req.get('host');
  if (!host) {
    return res.status(400).json({ ok: false, error: 'Host da requisição ausente.' });
  }

  const forwardedProto = (req.header('x-forwarded-proto') || req.protocol || 'http')
    .split(',')[0]
    .trim();
  const origin = `${forwardedProto}://${host}`;

  let target: URL;
  try {
    target = new URL(rawUrl.trim(), origin);
  } catch {
    return res.status(400).json({ ok: false, error: 'Endpoint inválido.' });
  }

  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return res.status(400).json({ ok: false, error: 'Use um endpoint http(s).' });
  }

  if (target.username || target.password) {
    return res.status(400).json({ ok: false, error: 'Endpoint não pode conter credenciais.' });
  }

  const isOwnHost = target.host.toLowerCase() === host.toLowerCase();

  if (!isOwnHost) {
    if (target.hostname.toLowerCase() === 'localhost') {
      return res.status(403).json({ ok: false, error: 'Endereço não permitido.' });
    }

    if (isIP(target.hostname)) {
      if (isPrivateAddress(target.hostname)) {
        return res.status(403).json({ ok: false, error: 'Endereço não permitido.' });
      }
    } else {
      try {
        const addresses = await lookup(target.hostname, { all: true, verbatim: true });
        if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) {
          return res.status(403).json({ ok: false, error: 'Endereço não permitido.' });
        }
      } catch {
        return res.json({ ok: false, status: 0, error: 'Não foi possível resolver o host.' });
      }
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(target, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: { 'user-agent': 'ReoboteSuporte/1.0 (health-check)' }
    });

    return res.json({
      ok: response.status >= 200 && response.status < 500,
      status: response.status
    });
  } catch {
    return res.json({ ok: false, status: 0 });
  } finally {
    clearTimeout(timer);
  }
});

// Consulta autenticada do painel: o navegador fala com este backend, nunca
// diretamente com o REOBOTE SISTEMAS (o segredo fica só no servidor).
app.get('/api/integrations/reobote-systems', async (req, res) => {
  const auth = await getAuthenticatedUser(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  if (!consumeSystemsCheckQuota(auth.user.id)) {
    return res.status(429).json({
      error: 'Muitas verificações em pouco tempo. Aguarde um minuto e tente novamente.'
    });
  }

  const result = await checkReoboteSystems({ timeoutMs: 8000 });

  res.setHeader('Cache-Control', 'no-store');
  return res.json(result);
});

// Qualquer rota /api desconhecida responde JSON (nunca o index.html do SPA).
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Rota da API não encontrada.' });
});

export default app;
