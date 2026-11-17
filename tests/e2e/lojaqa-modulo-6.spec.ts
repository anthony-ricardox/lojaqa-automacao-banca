// tests/e2e/lojaqa-modulo-6.spec.ts — testes de TELA do checkout (o que testar + o que esperar).
// Ler este arquivo deve parecer ler os casos de teste do Zephyr/Jira.
// Rodar na banca: npm run test:e2e   (abre o navegador: --headed)
import { test, expect } from '../../fixtures/auth.fixture'; // NOSSO test, com a sessão injetada
import { PRODUTO, entrega, cartoes } from '../../data/checkout.data';

test.describe('Módulo · Checkout: Pagamentos & Criação de Pedido', () => {
  // Roda antes de CADA teste: produto no carrinho + CPF e CEP preenchidos
  test.beforeEach(async ({ checkoutPage }) => {
    await test.step(`Adiciona "${PRODUTO}" ao carrinho e abre o checkout`, async () => {
      await checkoutPage.iniciarComProduto(PRODUTO);
    });
    await test.step('Preenche CPF, CEP (ViaCEP) e número', async () => {
      await checkoutPage.preencherEntrega(entrega);
    });
  });

  // SCRUM-13 · US-01
  test('CT-E2E-01 · PIX aplica 5% OFF e cria o pedido', async ({ checkoutPage, page }) => {
    // Defeitos da LOJA que este caso evidencia. Aparecem no relatório HTML do teste.
    // O teste confere o que funciona; os bugs ficam registrados no Jira com evidência.
    test.info().annotations.push(
      {
        type: 'BUG-06 (SCRUM-34)',
        description: 'O front lê orderData._id, mas a API devolve { message, order }: o painel abre com orderId=undefined e sem o modal.',
      },
      {
        type: 'BUG-07 (SCRUM-35)',
        description: 'O pedido é salvo com o total cheio (R$ 289,90): o desconto PIX só existe na tela (R$ 275,41).',
      },
    );

    const subtotal = await checkoutPage.valor(checkoutPage.subtotal);

    await test.step('Seleciona PIX e confere o desconto de 5%', async () => {
      await checkoutPage.pagarComPix();
      await expect(checkoutPage.descontoNome).toHaveText('Desconto PIX (5% OFF)');
      // expect.poll repete a leitura até bater (o total é recalculado na tela)
      await expect.poll(() => checkoutPage.valor(checkoutPage.total)).toBeCloseTo(subtotal * 0.95, 1);
    });

    let pedidoId = '';
    await test.step('Finaliza: a API cria o pedido (201) e devolve o id', async () => {
      const { status, corpo } = await checkoutPage.confirmarPedido();
      expect(status).toBe(201);
      expect(corpo.message).toBe('Pedido criado com sucesso.');
      expect(corpo.order._id).toMatch(/^[a-f0-9]{24}$/); // id do MongoDB: 24 caracteres hexadecimais
      pedidoId = corpo.order._id;
    });

    await test.step('A loja leva ao painel e o pedido aparece em "Meus pedidos"', async () => {
      // Por causa do BUG-06 a URL vem com orderId=undefined; conferimos só a página
      await expect(page).toHaveURL(/painel\.html/);
      await expect(checkoutPage.pedidoNaLista(pedidoId)).toBeVisible();
    });
  });

  // SCRUM-14 · US-02
  test('CT-E2E-02 · Cartão detecta bandeira e oferece 12 parcelas', async ({ checkoutPage }) => {
    await test.step('Cartão 4111… é reconhecido como Visa', async () => {
      await checkoutPage.preencherCartao(cartoes.visa);
      await expect(checkoutPage.bandeira).toHaveText('Visa');
    });

    await test.step('Cartão 5555… é reconhecido como Mastercard', async () => {
      await checkoutPage.cartaoNumero.fill(cartoes.master.numero);
      await expect(checkoutPage.bandeira).toHaveText('Mastercard');
    });

    await test.step('Oferece de 1x a 12x', async () => {
      await expect(checkoutPage.parcelas.locator('option')).toHaveCount(12);
    });
    // Não finaliza: economiza estoque da loja
  });

  // SCRUM-15 · US-02 (negativo)
  test('CT-E2E-03 · Cartão incompleto é bloqueado', async ({ checkoutPage, page }) => {
    await test.step('Tenta pagar com cartão de 12 dígitos', async () => {
      await checkoutPage.preencherCartao(cartoes.incompleto);
      await checkoutPage.confirmar();
    });

    await test.step('Loja bloqueia e continua no checkout', async () => {
      await expect(checkoutPage.aviso).toHaveText('Informe o número completo do cartão de crédito.');
      await expect(page).toHaveURL(/checkout\.html/);
    });
  });

  // SCRUM-16 · US-02 (negativo) · bug conhecido SCRUM-28 (BUG-01)
  test('CT-E2E-04 · [BUG-01] Cartão vencido deveria ser bloqueado', async ({ checkoutPage, page }) => {
    // test.fail = "sei que este teste falha por causa de um bug conhecido".
    // O relatório mostra "expected to fail". Quando corrigirem o bug, o Playwright avisa.
    test.fail(true, 'BUG-01 (SCRUM-28): checkout.js só confere o tamanho da validade, não a data');

    // Intercepta o POST /orders e cancela: mesmo com o bug, nenhum pedido real é criado
    await page.route('**/api/orders', (route) => route.abort());
    const enviou = page
      .waitForRequest('**/api/orders', { timeout: 3_000 })
      .then(() => true)
      .catch(() => false);

    await test.step('Tenta pagar com cartão vencido (01/20)', async () => {
      await checkoutPage.preencherCartao(cartoes.vencido);
      await checkoutPage.confirmar();
    });

    await test.step('Esperado: a loja NÃO envia o pedido e avisa sobre a validade', async () => {
      expect(await enviou, 'o pedido não deveria ser enviado').toBe(false);
      await expect(checkoutPage.aviso).toContainText(/validade|vencid|expirad/i);
    });
  });
});
