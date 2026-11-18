// rick-and-morty/fixtures/rick-and-morty.fixture.ts — entrega o API Object e a vitrine prontos ao teste.
// Mesma ideia da fixture da Loja QA: o teste só pede { rickApi, vitrine } e já recebe tudo arrumado.
// Aqui não há login: a Rick and Morty API é pública e não pede token.
import { test as base, expect, Page } from '@playwright/test';
import { RickAndMortyApi } from '../api/RickAndMortyApi';
import { Vitrine } from '../vitrine/Vitrine';

// VITRINE=0 no .env desliga a tela: os testes voltam a ser só API, sem navegador nenhum.
const VITRINE_LIGADA = process.env.VITRINE !== '0';

// Maximiza a janela pelo protocolo do Chrome (CDP). Em outro navegador, só segue com o tamanho padrão.
async function maximizar(page: Page) {
  try {
    const cdp = await page.context().newCDPSession(page);
    const { windowId } = await cdp.send('Browser.getWindowForTarget');
    await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'maximized' } });
  } catch {
    // não é Chromium: a janela fica no tamanho padrão, e a página continua responsiva
  }
}

type Fixtures = { rickApi: RickAndMortyApi };
type FixturesDoWorker = { vitrine: Vitrine };

export const test = base.extend<Fixtures, FixturesDoWorker>({
  rickApi: async ({ request }, use) => {
    await use(new RickAndMortyApi(request)); // aqui o teste roda
  },

  // scope 'worker': UMA página serve os 8 testes, então as chamadas vão se acumulando na tela,
  // uma a uma, na ordem em que os testes rodam. É só exibição: a vitrine não valida nada.
  vitrine: [
    VITRINE_LIGADA
      ? async ({ browser, headless }, use) => {
          // Sem tela (UI Mode, prints): tamanho fixo. Com a janela aberta: viewport null = a página
          // acompanha o tamanho da janela (responsiva), e a janela já abre maximizada.
          const page = await browser.newPage({ viewport: headless ? { width: 1280, height: 800 } : null });
          if (!headless) await maximizar(page);
          await use(await Vitrine.abrir(page)); // aqui os testes rodam
          // Com a janela aberta (--headed), a vitrine fica parada para análise até você fechar a janela
          if (!headless) {
            console.log('\n🔎 Vitrine aberta: clique nas chamadas à direita para analisar. Feche a janela para terminar.');
            await page.waitForEvent('close', { timeout: 0 });
          }
          if (!page.isClosed()) await page.close();
        }
      : async ({}, use) => {
          await use(new Vitrine(null)); // desligada: só imprime no console
        },
    { scope: 'worker', timeout: 0 }, // sem limite de tempo: a janela espera você terminar de analisar
  ],
});

export { expect };
