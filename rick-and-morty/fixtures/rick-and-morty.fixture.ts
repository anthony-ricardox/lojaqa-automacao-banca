// rick-and-morty/fixtures/rick-and-morty.fixture.ts — entrega o API Object pronto ao teste.
// Mesma ideia da fixture da Loja QA: o teste só pede { rickApi } e já recebe o "controle remoto" da API.
// Aqui não há login: a Rick and Morty API é pública e não pede token.
import { test as base, expect } from '@playwright/test';
import { RickAndMortyApi } from '../api/RickAndMortyApi';

type Fixtures = { rickApi: RickAndMortyApi };

export const test = base.extend<Fixtures>({
  rickApi: async ({ request }, use) => {
    await use(new RickAndMortyApi(request)); // aqui o teste roda
  },
});

export { expect };
