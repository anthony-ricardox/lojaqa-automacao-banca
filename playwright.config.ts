// playwright.config.ts — o "painel de controle" do projeto.
// Tudo que vale para TODOS os testes fica aqui: onde estão, qual navegador,
// tempos máximos e o que guardar quando algo falha.
import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config'; // carrega as variáveis do arquivo .env em process.env

export default defineConfig({
  testDir: './tests', // pasta onde o Playwright procura arquivos *.spec.ts
  timeout: 60_000, // tempo máximo de UM teste (60 s; a API no Render pode "acordar" devagar)
  expect: { timeout: 10_000 }, // tempo máximo que cada expect espera a condição ficar verdadeira
  workers: 1, // 1 teste por vez: na banca fica fácil narrar o que está acontecendo
  reporter: [['list'], ['html', { open: 'never' }]], // lista no terminal + relatório HTML

  // "use" = opções padrão de todos os testes
  use: {
    trace: 'retain-on-failure', // guarda o "filme" passo a passo só quando falha
    screenshot: 'only-on-failure', // print da tela quando falha
    video: 'retain-on-failure', // vídeo quando falha
    launchOptions: { slowMo: Number(process.env.SLOWMO ?? 0) }, // deixa o robô mais lento (400 na banca)
  },

  // "projects" = grupos de testes com configurações diferentes
  projects: [
    // 1) setup: roda ANTES dos outros. Faz login 1 vez pela API e guarda o token.
    { name: 'setup', testMatch: /auth\.setup\.ts$/ },

    // 2) e2e: testes de tela. Só começa depois do setup (dependencies).
    {
      name: 'e2e',
      testMatch: /e2e\/.*\.spec\.ts$/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.LOJA_URL, // permite page.goto('loja.html')
        testIdAttribute: 'id', // getByTestId('cardNumber') encontra o elemento com id="cardNumber"
      },
    },

    // 3) api: testes de API, sem navegador.
    {
      name: 'api',
      testMatch: /api\/.*\.spec\.ts$/,
      dependencies: ['setup'],
      use: { baseURL: process.env.API_URL }, // termina com /api/ -> use request.get('products') SEM barra
    },
  ],
});
