// fixtures/auth.fixture.ts — "ajudantes" que o Playwright entrega prontos ao teste.
// Uma fixture prepara o terreno ANTES do teste e limpa DEPOIS (o que vem após use()).
// Os specs E2E importam { test, expect } DAQUI, e não de '@playwright/test'.
import { test as base, expect } from '@playwright/test';
import fs from 'fs';
import { CheckoutPage } from '../pages/CheckoutPage';
import { SESSAO } from './sessao';

type Fixtures = { checkoutPage: CheckoutPage };

export const test = base.extend<Fixtures>({
  // Sobrescreve a fixture "page": antes de qualquer script da loja rodar,
  // grava no localStorage as MESMAS chaves que o script.js da loja grava
  // depois de um login. Resultado: a loja já abre logada.
  page: async ({ page }, use) => {
    const { token, user } = JSON.parse(fs.readFileSync(SESSAO, 'utf8'));
    await page.addInitScript(([t, u]) => {
      localStorage.setItem('token', t);
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('currentUser', u);
    }, [token, JSON.stringify(user)]);
    await use(page); // aqui o teste roda
  },

  // Entrega o Page Object já criado: o teste só pede { checkoutPage }
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
});

export { expect };
