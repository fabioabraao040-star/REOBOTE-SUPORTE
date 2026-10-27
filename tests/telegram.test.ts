import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTelegramMessage, sendTelegramMessage } from '../telegram.js';

const TOKEN = 'token-de-teste-nao-real';
const CHAT_ID = 'chat-de-teste-nao-real';

test('formatação do alerta inclui marcação TESTE e serviço', () => {
  const text = formatTelegramMessage({
    message: '[TESTE] Evento sintético de alerta automático.',
    severity: 'info',
    serviceName: 'Teste de alerta automático',
    now: new Date('2026-10-26T13:00:00.000Z'),
  });

  assert.match(text, /ℹ️ \[INFO\]/);
  assert.match(text, /Sistema: REOBOTE SUPORTE/);
  assert.match(text, /Serviço: Teste de alerta automático/);
  assert.match(text, /\[TESTE\] Evento sintético/);
});

test('envio confirmado pelo Telegram retorna sucesso sem vazar token ou chat', async () => {
  let requestUrl = '';
  let requestBody: Record<string, unknown> = {};

  const result = await sendTelegramMessage({
    token: TOKEN,
    chatId: CHAT_ID,
    message: '[TESTE] Evento sintético.',
    severity: 'info',
    serviceName: 'Teste',
    fetchImpl: async (input, init) => {
      requestUrl = String(input);
      requestBody = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  assert.equal(result.error, null);
  assert.match(requestUrl, /api\.telegram\.org\/bot.*\/sendMessage/);
  assert.equal(requestBody.chat_id, CHAT_ID);
  assert.match(String(requestBody.text), /\[TESTE\]/);

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(TOKEN), false);
  assert.equal(serialized.includes(CHAT_ID), false);
});

test('recusa do Telegram não é tratada como sucesso', async () => {
  const result = await sendTelegramMessage({
    token: TOKEN,
    chatId: CHAT_ID,
    message: '[TESTE] Evento sintético.',
    fetchImpl: async () =>
      new Response(JSON.stringify({ ok: false, description: 'chat not found' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.match(result.error || '', /não confirmou/i);
});

test('configuração ausente falha sem chamar a API do Telegram', async () => {
  let called = false;

  const result = await sendTelegramMessage({
    token: '',
    chatId: '',
    message: '[TESTE] Evento sintético.',
    fetchImpl: async () => {
      called = true;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    },
  });

  assert.equal(called, false);
  assert.equal(result.ok, false);
  assert.match(result.error || '', /não configurado/i);
});

test('falha de rede e timeout são reportados sem detalhes sensíveis', async () => {
  const network = await sendTelegramMessage({
    token: TOKEN,
    chatId: CHAT_ID,
    message: '[TESTE] Evento sintético.',
    fetchImpl: async () => {
      throw new TypeError('fetch failed');
    },
  });

  assert.equal(network.ok, false);
  assert.equal(network.status, null);
  assert.match(network.error || '', /Falha de conexão/i);

  const timeout = await sendTelegramMessage({
    token: TOKEN,
    chatId: CHAT_ID,
    message: '[TESTE] Evento sintético.',
    fetchImpl: async () => {
      const error = new Error('timed out');
      error.name = 'TimeoutError';
      throw error;
    },
  });

  assert.equal(timeout.ok, false);
  assert.match(timeout.error || '', /Tempo esgotado/i);
  assert.equal(JSON.stringify(timeout).includes(TOKEN), false);
});
