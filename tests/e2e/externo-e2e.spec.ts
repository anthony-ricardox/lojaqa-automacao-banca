// tests/e2e/externo-e2e.spec.ts — Desafio de mercado E2E: checkout completo no SauceDemo (CT-EXT-01).
// SauceDemo é a loja de demonstração pública da Sauce Labs, usada no mercado para treinar automação.
// Não usa a nossa fixture de sessão: não é a Loja QA, então nada de token no localStorage.
// Rodar: npm run test:sauce
import { test, expect } from '@playwright/test';

// O SauceDemo marca os elementos com o atributo data-test (a Loja QA usa id).
// test.use troca o atributo do getByTestId só neste arquivo.
test.use({ testIdAttribute: 'data-test' });

const SAUCEDEMO = 'https://www.saucedemo.com/';
// Usuário público de demonstração, impresso na própria tela de login do SauceDemo
const usuario = { nome: 'standard_user', senha: 'secret_sauce' };
const comprador = { nome: 'Banca', sobrenome: 'FAP', cep: '50740-560' };
const PRODUTO = 'Sauce Labs Backpack';

// Converte "Total: $32.39" em 32.39
const dolares = (texto: string) => Number(texto.replace(/[^\d.]/g, ''));

// SCRUM-23 · US-04
test('CT-EXT-01 · SauceDemo: checkout completo da mochila', async ({ page }) => {
  await test.step('Login com o usuário de demonstração', async () => {
    await page.goto(SAUCEDEMO);
    await page.getByTestId('username').fill(usuario.nome);
    await page.getByTestId('password').fill(usuario.senha);
    await page.getByTestId('login-button').click();
    await expect(page).toHaveURL(/inventory\.html/);
  });

  await test.step('Adiciona a mochila e abre o carrinho', async () => {
    await page.getByTestId('add-to-cart-sauce-labs-backpack').click();
    await expect(page.getByTestId('shopping-cart-badge')).toHaveText('1');
    await page.getByTestId('shopping-cart-link').click();
    await expect(page.getByTestId('inventory-item-name')).toHaveText(PRODUTO);
  });

  await test.step('Preenche os dados do comprador', async () => {
    await page.getByTestId('checkout').click();
    await page.getByTestId('firstName').fill(comprador.nome);
    await page.getByTestId('lastName').fill(comprador.sobrenome);
    await page.getByTestId('postalCode').fill(comprador.cep);
    await page.getByTestId('continue').click();
  });

  await test.step('Confere o resumo: total = itens + imposto', async () => {
    const itens = dolares(await page.getByTestId('subtotal-label').innerText());
    const imposto = dolares(await page.getByTestId('tax-label').innerText());
    const total = dolares(await page.getByTestId('total-label').innerText());
    console.log(`\n▶ CT-EXT-01 · resumo do SauceDemo: itens $${itens} + imposto $${imposto} = total $${total}`);
    expect(total).toBeCloseTo(itens + imposto, 2);
  });

  await test.step('Finaliza e confere a confirmação', async () => {
    await page.getByTestId('finish').click();
    await expect(page.getByTestId('complete-header')).toHaveText('Thank you for your order!');
  });
});
