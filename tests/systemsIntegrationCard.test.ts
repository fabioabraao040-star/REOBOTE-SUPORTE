import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SystemsIntegrationCard } from '../src/components/SystemsIntegrationCard.js';
import type { SystemsIntegrationStatus } from '../src/types.js';

const operationalStatus: SystemsIntegrationStatus = {
  configured: true,
  state: 'operational',
  checkedAt: '2026-10-26T13:00:00.000Z',
  latencyMs: 120,
  error: null,
  remote: {
    service: 'REOBOTE SISTEMAS',
    status: 'operational',
    checkedAt: '2026-10-26T13:00:00.000Z',
    checks: {
      application: { status: 'operational', uptimeSeconds: 3600 },
      api: { status: 'operational' },
      monitoringEndpoint: { status: 'operational' },
      supabase: { status: 'operational', latencyMs: 20 },
      whatsapp: { status: 'connected', lastCheck: '2026-10-26T12:55:00.000Z' },
    },
  },
};

function render(status: SystemsIntegrationStatus | null) {
  return renderToStaticMarkup(
    React.createElement(SystemsIntegrationCard, {
      status,
      checking: false,
      onCheck: () => {},
    })
  );
}

test('card exibe estado operacional real dos indicadores', () => {
  const html = render(operationalStatus);

  assert.match(html, /Integração REOBOTE SISTEMAS/);
  assert.match(html, /Operacional/);
  assert.match(html, /WhatsApp/);
  assert.match(html, /Conectado/);
  assert.match(html, /Supabase/);
  assert.equal(html.includes('Não configurado'), false);
});

test('card exibe configuração pendente sem inventar estado operacional', () => {
  const html = render({
    configured: false,
    state: 'not_configured',
    checkedAt: '2026-10-26T13:00:00.000Z',
    latencyMs: null,
    error: 'Integração não configurada no servidor.',
    remote: null,
  });

  assert.match(html, /Não configurado/);
  assert.match(html, /REOBOTE_SYSTEMS_URL/);
  assert.match(html, /REOBOTE_MONITORING_SECRET/);
});

test('card exibe indisponibilidade e erro sem marcar como saudável', () => {
  const html = render({
    configured: true,
    state: 'unavailable',
    checkedAt: '2026-10-26T13:00:00.000Z',
    latencyMs: 8000,
    error: 'Tempo esgotado ao consultar o REOBOTE SISTEMAS.',
    remote: null,
  });

  assert.match(html, /Indisponível/);
  assert.match(html, /Tempo esgotado/);
  assert.equal(html.includes('>Operacional<'), false);
});
