import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ServicesView } from '../src/components/ServicesView.js';
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

function render(overrides: Partial<React.ComponentProps<typeof ServicesView>> = {}) {
  return renderToStaticMarkup(
    React.createElement(ServicesView, {
      services: [],
      systemsStatus: null,
      systemsChecking: false,
      onCheckSystems: () => {},
      canRunTests: true,
      telegramTest: feedback({
        status: 'success',
        result: telegramResult,
        checkedAt: telegramResult.checkedAt,
      }),
      supabaseTest: feedback({
        status: 'success',
        result: supabaseResult,
        checkedAt: supabaseResult.checkedAt,
      }),
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
      onAddService: () => {},
      onUpdateServiceStatus: () => {},
      onTestService: async () => {},
      ...overrides,
    })
  );
}

test('tela real de Serviços contém os cinco botões de teste', () => {
  const html = render();

  assert.match(html, /data-testid="integration-tests-panel"/);
  assert.match(html, /Testar Telegram/);
  assert.match(html, /Testar Supabase/);
  assert.match(html, /Testar alerta automático/);
  assert.match(html, /Testar segurança da integração/);
  assert.match(html, /Verificar REOBOTE SISTEMAS/);
});

test('testes controlados aparecem antes do card da integração', () => {
  const html = render();
  const panelIndex = html.indexOf('data-testid="integration-tests-panel"');
  const systemsIndex = html.indexOf('data-testid="systems-integration-card"');

  assert.ok(panelIndex >= 0, 'painel de testes não foi renderizado');
  assert.ok(systemsIndex > panelIndex, 'painel de testes ficou depois do card da integração');
});

test('resultados reais da tela não são substituídos por valores fictícios', () => {
  const html = render();

  assert.match(html, /Mensagem de teste processada pelo endpoint real do Telegram/);
  assert.match(html, /Banco\/REST: Operacional \(HTTP 204\)/);
  assert.match(html, /Evento \[TESTE\] entregue/);
  assert.match(html, /Sem credencial: 401/);
  assert.match(html, /Credencial inválida: 403/);
});

test('perfil sem permissão vê os quatro testes desabilitados na tela real', () => {
  const html = render({
    canRunTests: false,
    telegramTest: feedback(),
    supabaseTest: feedback(),
    automaticAlertTest: feedback(),
    securityTest: feedback(),
  });

  assert.match(html, /Somente perfis admin e operador/);
  assert.equal((html.match(/disabled=""/g) || []).length, 4);
});
