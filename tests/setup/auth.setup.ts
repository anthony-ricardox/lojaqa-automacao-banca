// tests/setup/auth.setup.ts — PREPARAÇÃO, não é teste da banca.
// A API permite só 5 logins por IP a cada 15 minutos. Por isso logamos
// UMA vez pela API, salvamos { token, user } num arquivo e reaproveitamos
// por 1 hora. O login nunca aparece na tela (regra de ouro da atividade).
import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import { SESSAO } from '../../fixtures/sessao';

setup('preparação: token do cliente via API', async ({ request }) => {
  // Se o arquivo existe e tem menos de 1 hora, pula o login
  const recente = fs.existsSync(SESSAO) && Date.now() - fs.statSync(SESSAO).mtimeMs < 60 * 60 * 1000;
  setup.skip(recente, 'Token reaproveitado (evita o rate limit do login)');

  // POST /api/login com a massa de dados do cliente (vem do .env)
  const res = await request.post(`${process.env.API_URL}login`, {
    data: { email: process.env.CLIENTE_EMAIL, password: process.env.CLIENTE_SENHA },
  });
  expect(res.status(), 'login do cliente deveria responder 200').toBe(200);

  fs.mkdirSync('.auth', { recursive: true });
  fs.writeFileSync(SESSAO, JSON.stringify(await res.json())); // salva { token, user }
});
