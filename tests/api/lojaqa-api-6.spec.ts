// tests/api/lojaqa-api-6.spec.ts — testes de API do checkout: POST /api/orders e GET /api/orders/me.
// Sem navegador: a fixture { request } do Playwright é um cliente HTTP.
// O token vem do setup (.auth/sessao.json), então nenhum teste faz login de novo.
// Cada chamada imprime no console STATUS, CONTENT-TYPE e o JSON, para a banca acompanhar.
// Rodar na banca: npm run test:api
import { test, expect, APIResponse } from '@playwright/test';
import fs from 'fs';
import { SESSAO } from '../../fixtures/sessao';
import { enderecoApi, mensagensApi } from '../../data/checkout.data';

// Formato das respostas (contrato da API). O TypeScript avisa se usarmos um campo que não existe.
type Produto = { _id: string; name: string; price: number; stock: number };
type ItemPedido = { productId: string; name: string; quantity: number; unitPrice: number };
type Pedido = { _id: string; items: ItemPedido[]; total: number; status: string; shippingAddress: string };
type PedidoCriado = { message: string; order: Pedido };
type Erro = { error: string };

let token: string; // credencial do cliente (Bearer)
let produto: Produto; // produto escolhido para os pedidos
let pedidoId: string; // criado no CT-API-01, procurado no CT-API-02

// Mostra para a banca exatamente o que a API respondeu
async function log(nome: string, res: APIResponse, corpo?: unknown) {
  console.log(`\n▶ ${nome}`);
  console.log(`  STATUS: ${res.status()} ${res.statusText()}`);
  console.log(`  CONTENT-TYPE: ${res.headers()['content-type']}`);
  console.log(JSON.stringify(corpo ?? (await res.json()), null, 2));
}

// Os testes rodam em ordem e compartilham estado: o CT-API-02 procura o pedido criado no CT-API-01
test.describe.configure({ mode: 'serial' });

test.describe('API · POST /api/orders e GET /api/orders/me', () => {
  const autenticado = () => ({ Authorization: `Bearer ${token}` });

  test.beforeAll(async ({ request }) => {
    token = JSON.parse(fs.readFileSync(SESSAO, 'utf8')).token; // sem novo login (rate limit)
    const lista: Produto[] = await (await request.get('products')).json();
    // O de maior estoque: o teste nunca esgota um produto da vitrine
    produto = lista.filter((p) => p.stock >= 2).sort((a, b) => b.stock - a.stock)[0];
  });

  // SCRUM-17 · US-03
  test('CT-API-01 · cria pedido (201) e baixa o estoque', async ({ request }) => {
    let corpo!: PedidoCriado;

    await test.step('POST /api/orders com token, 1 item e endereço', async () => {
      const res = await request.post('orders', {
        headers: autenticado(),
        data: { items: [{ productId: produto._id, quantity: 1 }], shippingAddress: enderecoApi },
      });
      corpo = await res.json();
      await log('CT-API-01 · POST /api/orders', res, corpo);

      expect(res.status()).toBe(201);
      expect(res.headers()['content-type']).toContain('application/json');
      expect(corpo.message).toBe(mensagensApi.pedidoCriado);
      expect(corpo.order._id).toMatch(/^[a-f0-9]{24}$/); // id do MongoDB
      expect(corpo.order).toMatchObject({ status: 'pending', shippingAddress: enderecoApi });
      expect(corpo.order.items[0]).toMatchObject({ productId: produto._id, quantity: 1, unitPrice: produto.price });
      expect(corpo.order.total).toBeCloseTo(produto.price, 2); // 1 unidade x preço
      pedidoId = corpo.order._id;
    });

    await test.step('Baixa atômica: o estoque caiu exatamente 1', async () => {
      const depois: Produto[] = await (await request.get('products')).json();
      const atual = depois.find((p) => p._id === produto._id)!;
      console.log(`  ESTOQUE de "${produto.name}": ${produto.stock} → ${atual.stock}`);
      expect(atual.stock).toBe(produto.stock - 1);
    });
  });

  // SCRUM-18 · US-03
  test('CT-API-02 · pedido aparece em GET /api/orders/me', async ({ request }) => {
    const res = await request.get('orders/me', { headers: autenticado() });
    const pedidos: Pedido[] = await res.json();
    const meu = pedidos.find((p) => p._id === pedidoId);
    await log(`CT-API-02 · GET /api/orders/me (${pedidos.length} pedidos; abaixo, o do CT-API-01)`, res, meu);

    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/json');
    expect(Array.isArray(pedidos)).toBe(true);
    expect(meu, 'o pedido criado no CT-API-01 deveria estar na lista').toBeDefined();
    expect(meu!.status).toBe('pending');
  });

  // SCRUM-19 · US-03 (negativo)
  test('CT-API-03 · sem itens e endereço retorna 400', async ({ request }) => {
    await test.step('Itens vazios e endereço em branco', async () => {
      const res = await request.post('orders', { headers: autenticado(), data: { items: [], shippingAddress: '' } });
      await log('CT-API-03 · POST /api/orders sem itens e sem endereço', res);
      expect(res.status()).toBe(400);
      expect(res.headers()['content-type']).toContain('application/json');
      expect(((await res.json()) as Erro).error).toBe(mensagensApi.semItensOuEndereco);
    });

    await test.step('Quantidade 0 também é recusada', async () => {
      const res = await request.post('orders', {
        headers: autenticado(),
        data: { items: [{ productId: produto._id, quantity: 0 }], shippingAddress: enderecoApi },
      });
      await log('CT-API-03 · POST /api/orders com quantidade 0', res);
      expect(res.status()).toBe(400);
      expect(((await res.json()) as Erro).error).toBe(mensagensApi.quantidadeInvalida);
    });
  });

  // SCRUM-20 · US-03 (negativo) · bug conhecido BUG-08 (SCRUM-36)
  test('CT-API-04 · [BUG-08] sem token deveria retornar 401', async ({ request }) => {
    // A API reconhece o problema (as mensagens estão certas), mas devolve 401 e 403 trocados.
    // test.fail documenta o bug: hoje "falha como esperado"; quando corrigirem, o Playwright avisa.
    test.fail(true, 'BUG-08 (SCRUM-36): sem token a API responde 403 e com token inválido 401; o contrato diz o contrário');
    const pedido = { items: [{ productId: produto._id, quantity: 1 }], shippingAddress: enderecoApi };

    const semToken = await request.post('orders', { data: pedido });
    await log('CT-API-04 · POST /api/orders SEM token', semToken);
    expect(((await semToken.json()) as Erro).error).toBe(mensagensApi.semToken);

    const tokenInvalido = await request.post('orders', { headers: { Authorization: 'Bearer token-invalido' }, data: pedido });
    await log('CT-API-04 · POST /api/orders com token INVÁLIDO', tokenInvalido);
    expect(((await tokenInvalido.json()) as Erro).error).toBe(mensagensApi.tokenInvalido);

    // expect.soft confere os dois códigos antes de o teste terminar, para o relatório mostrar ambos
    expect.soft(semToken.status(), 'sem token: o contrato diz 401').toBe(401);
    expect.soft(tokenInvalido.status(), 'token inválido: o contrato diz 403').toBe(403);
  });

  // SCRUM-21 · US-03 (negativo)
  test('CT-API-05 · acima do estoque retorna 409', async ({ request }) => {
    const res = await request.post('orders', {
      headers: autenticado(),
      data: { items: [{ productId: produto._id, quantity: produto.stock + 1000 }], shippingAddress: enderecoApi },
    });
    await log('CT-API-05 · POST /api/orders acima do estoque', res);

    expect(res.status()).toBe(409);
    expect(res.headers()['content-type']).toContain('application/json');
    expect(((await res.json()) as Erro).error).toBe(`${mensagensApi.estoqueInsuficiente} ${produto.name}.`);
  });
});
