import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Navbar } from '../src/components/Navbar.js';

function render(overrides: Partial<React.ComponentProps<typeof Navbar>> = {}) {
  return renderToStaticMarkup(
    React.createElement(Navbar, {
      currentTabTitle: 'Serviços Supabase & Vercel',
      services: [],
      incidents: [],
      onTestTelegram: () => {},
      onRefreshData: () => {},
      isRefreshing: false,
      isTestingTelegram: false,
      lastTelegramTestAt: '2026-10-26T13:00:00.000Z',
      ...overrides,
    })
  );
}

test('navbar preserva o botão Testar Telegram na tela de serviços', () => {
  const html = render();

  assert.match(html, /Serviços Supabase &amp; Vercel/);
  assert.match(html, /data-testid="test-telegram-navbar"/);
  assert.match(html, /Testar Telegram/);
});

test('botão existente do Telegram exibe carregamento e fica desabilitado', () => {
  const html = render({ isTestingTelegram: true });

  assert.match(html, /Enviando\.\.\./);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /disabled=""/);
});
