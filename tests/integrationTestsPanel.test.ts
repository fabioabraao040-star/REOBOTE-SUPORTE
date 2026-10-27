import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { IntegrationTestsPanel } from '../src/components/IntegrationTestsPanel.js';
import type {
  AutomaticAlertTestResult,
  IntegrationSecurityResult,
  SupabaseConnectivityResult,
  TelegramTestResult,
  TestFeedback,
} from '../src/types.js';

function feedback<T>(partial: Partial<TestFeedback<T>> = {}): TestFeedback<T> {
  return {
    status: 'idle',
    result: null,
    error: null,
    checkedAt: null,
    ...partial,
  };
}

const telegramResult: TelegramTestResult = {
  success: true,
  simulated: false,
  checkedAt: '2026-10-26T13:00:03.000Z',
};

const supabaseResult: SupabaseConnectivityResult = {
  configured: true,
  state: 'operational',
  checkedAt: '2026-10-26T13:00:00.000Z',
  latencyMs: 123,
  checks: {
    database: { status: 'operational', httpStatus: 204, latencyMs: 80 },
    auth: { status: 'operational', httpStatus: 200, latencyMs: 40 },
  },
  error: null,
};

const alertResult: AutomaticAlertTestResult = {
  success: true,
  simulated: false,
  test: true,
  testId: 'TESTE-123',
  checkedAt: '2026-10-26T13:00:01.000Z',
};

const securityResult: IntegrationSecurityResult = {
  configured: true,
  state: 'passed',
  checkedAt: '2026-10-26T13:00:02.000Z',
  latencyMs: 90,
  checks: {
    withoutCredential: { status: 401, passed: true, latencyMs: 40 },
    invalidCredential: { status: 403, passed: true, latencyMs: 40 },
  },
  error: null,
};

function render(overrides: Partial<React.ComponentProps<typeof IntegrationTestsPanel>> = {}) {
  return renderToStaticMarkup(
    React.createElement(IntegrationTestsPanel, {
      canRun: true,
      telegramTest: feedback({
        status: 'success',
        result: telegramResult,
        checkedAt: telegramResult.checkedAt,
      }),
      supabaseTest: feedback({ status: 'success', result: supabaseResult, checkedAt: supabaseResult.checkedAt }),
      automaticAlertTest: feedback({
        status: 'success',
        result: alertResult,
        checkedAt: alertResult.checkedAt,
      }),
      securityTest: feedback({
        status: 'success',
        result: securityResult,
        checkedAt: securityResult.checkedAt,
      }),
      onTestTelegram: () => {},
      onTestSupabase: () => {},
      onTestAutomaticAlert: () => {},
      onTestIntegrationSecurity: () => {},
      ...overrides,
    })
  );
}

test('painel renderiza os quatro testes com resultados reais', () => {
  const html = render();

  assert.match(html, /Testar Telegram/);
  assert.match(html, /Testar Supabase/);
  assert.match(html, /Testar alerta automático/);
  assert.match(html, /Testar segurança da integração/);
  assert.match(html, /Mensagem de teste processada pelo endpoint real do Telegram/);
  assert.match(html, /Banco\/REST: Operacional \(HTTP 204\)/);
  assert.match(html, /Auth: Operacional \(HTTP 200\)/);
  assert.match(html, /Evento \[TESTE\] entregue/);
  assert.match(html, /Sem credencial: 401/);
  assert.match(html, /Credencial inválida: 403/);
  assert.match(html, /data-testid="test-telegram"/);
  assert.match(html, /data-testid="test-supabase"/);
  assert.match(html, /data-testid="test-automatic-alert"/);
  assert.match(html, /data-testid="test-integration-security"/);
});

test('falha real não é exibida como sucesso', () => {
  const html = render({
    supabaseTest: feedback({
      status: 'error',
      error: 'A chave pública foi recusada pela API REST do Supabase.',
      checkedAt: '2026-10-26T13:00:00.000Z',
    }),
    securityTest: feedback({
      status: 'error',
      result: { ...securityResult, state: 'failed' },
      error: 'Falha de segurança: o endpoint aceitou a chamada sem credencial.',
      checkedAt: '2026-10-26T13:00:00.000Z',
    }),
  });

  assert.match(html, /A chave pública foi recusada/);
  assert.match(html, /Falha de segurança/);
  assert.match(html, /Falhou/);
});

test('perfil sem permissão vê botões desabilitados', () => {
  const html = render({
    canRun: false,
    telegramTest: feedback(),
    supabaseTest: feedback(),
    automaticAlertTest: feedback(),
    securityTest: feedback(),
  });

  assert.match(html, /Somente perfis admin e operador/);
  assert.equal((html.match(/disabled=""/g) || []).length, 4);
  assert.match(html, /Ainda não executado/);
});
