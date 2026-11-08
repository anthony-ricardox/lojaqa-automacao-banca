// playwright.config.ts — o "painel de controle" do projeto.
// Tudo que vale para TODOS os testes fica aqui: onde estão, qual navegador,
// tempos máximos e o que guardar quando algo falha.

// ===== BLOCO A: importações e regras gerais =====
import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config'; // lê o .env e coloca os valores em process.env

export default defineConfig({
  testDir: './tests', // onde o Playwright procura os testes
  timeout: 60_000, // cada teste pode levar até 60 s (a API no Render "acorda" devagar)
  expect: { timeout: 10_000 }, // cada verificação espera até 10 s a condição ficar verdadeira
  workers: 1, // 1 teste por vez: na banca fica fácil narrar
  reporter: [['list'], ['html', { open: 'never' }]], // lista no terminal + relatório HTML

  // ===== BLOCO B: o que guardar quando algo falha =====
  use: {
    trace: 'retain-on-failure', // "filme" passo a passo, só quando falha
    screenshot: 'only-on-failure', // print da tela, só quando falha
    video: 'retain-on-failure', // vídeo, só quando falha
    launchOptions: { slowMo: Number(process.env.SLOWMO ?? 0) }, // velocidade do robô
  },

  // ===== BLOCO C: os 3 "projects" (grupos de testes) =====
  projects: [
    // 1) setup: roda ANTES de tudo. Faz login 1 vez pela API e guarda o token.
    { name: 'setup', testMatch: /auth\.setup\.ts$/ },

    // 2) e2e: testes de tela, no Chrome. Só começa depois do setup.
    {
      name: 'e2e',
      testMatch: /e2e\/.*\.spec\.ts$/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.LOJA_URL, // permite page.goto('loja.html')
        testIdAttribute: 'id', // getByTestId('cardNumber') acha o elemento com id="cardNumber"
      },
    },

    // 3) api: testes de API, sem navegador.
    {
      name: 'api',
      testMatch: /api\/.*\.spec\.ts$/,
      dependencies: ['setup'],
      use: { baseURL: process.env.API_URL }, // depois usamos request.get('products'), SEM barra
    },
  ],
});
