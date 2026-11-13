// pages/CheckoutPage.ts — Page Object do checkout (o "controle remoto" da tela).
// Guarda COMO interagir com a página: onde está cada elemento e quais ações existem.
// REGRA DA RUBRICA: nenhum expect aqui. O Page Object só age; quem verifica é o spec.
// Se um campo mudar de nome na loja, conserta-se só aqui.
import { Page, Locator } from '@playwright/test';

// Tipos deixam o TypeScript avisar se faltar um campo na massa de dados
export type Cartao = { numero: string; titular: string; validade: string; cvv: string };
export type Entrega = { cpf: string; cep: string; numero: string };
// Formato da resposta 201 do POST /api/orders (contrato da API)
export type PedidoCriado = { message: string; order: { _id: string; total: number; status: string } };

export class CheckoutPage {
  // Locators = "endereços" dos elementos. São preguiçosos: só procuram na hora da ação.
  readonly abrirCarrinho: Locator;
  readonly continuarCheckout: Locator;
  readonly cpf: Locator;
  readonly cep: Locator;
  readonly numero: Locator;
  readonly abaCartao: Locator;
  readonly abaPix: Locator;
  readonly cartaoNumero: Locator;
  readonly cartaoTitular: Locator;
  readonly cartaoValidade: Locator;
  readonly cartaoCvv: Locator;
  readonly bandeira: Locator;
  readonly parcelas: Locator;
  readonly subtotal: Locator;
  readonly descontoNome: Locator;
  readonly total: Locator;
  readonly finalizar: Locator;
  readonly aviso: Locator;
  readonly modalPedido: Locator;

  constructor(readonly page: Page) {
    // Botões: getByRole (como um leitor de tela enxerga) = seletor semântico
    this.abrirCarrinho = page.getByRole('button', { name: /^Carrinho/ });
    this.continuarCheckout = page.getByRole('button', { name: 'Continuar para checkout' });
    this.abaCartao = page.getByRole('button', { name: /^Cartão de Crédito/ });
    this.abaPix = page.getByRole('button', { name: /^PIX/ });
    this.finalizar = page.getByRole('button', { name: 'Confirmar e Finalizar Pedido' });

    // Campos: getByTestId lê o atributo id (testIdAttribute: 'id' no playwright.config.ts)
    this.cpf = page.getByTestId('buyerCpf');
    this.cep = page.getByTestId('deliveryCep');
    this.numero = page.getByTestId('deliveryNumber');
    this.cartaoNumero = page.getByTestId('cardNumber');
    this.cartaoTitular = page.getByTestId('cardHolderName');
    this.cartaoValidade = page.getByTestId('cardExpiryDate');
    this.cartaoCvv = page.getByTestId('cardCvvCode');
    this.bandeira = page.getByTestId('detectedBrandIcon');
    this.parcelas = page.getByTestId('cardInstallmentsSelect');
    this.subtotal = page.getByTestId('priceSubtotal');
    this.descontoNome = page.getByTestId('priceDiscountName');
    this.total = page.getByTestId('priceTotal');
    this.aviso = page.getByTestId('checkoutNotice'); // mensagens de erro/sucesso
    this.modalPedido = page.getByTestId('orderDetailModal'); // fica no painel.html
  }

  // Vitrine -> card do produto -> carrinho -> checkout
  async iniciarComProduto(nome: string) {
    await this.page.goto('loja.html');
    await this.page
      .locator('article')
      .filter({ hasText: nome })
      .getByRole('button', { name: 'Adicionar ao carrinho' })
      .click();
    await this.abrirCarrinho.click();
    await this.continuarCheckout.click();
    // Espera o checkout.html terminar de carregar (evento "load"). Os campos aparecem
    // antes do checkout.js rodar; se o robô digitar cedo demais, as máscaras e a busca
    // do CEP ainda não existem e o ViaCEP nunca é chamado (condição de corrida).
    await this.page.waitForURL(/checkout\.html/);
  }

  async preencherEntrega(d: Entrega) {
    await this.cpf.fill(d.cpf);
    // O CEP com 8 dígitos dispara a consulta ao ViaCEP. Em vez de "esperar X segundos"
    // (proibido: waitForTimeout), esperamos a RESPOSTA da requisição chegar.
    // Atenção à ordem: primeiro começa a "escutar", depois digita.
    const viaCep = this.page.waitForResponse((r) => r.url().includes('viacep.com.br/ws/'));
    await this.cep.fill(d.cep);
    await viaCep;
    await this.numero.fill(d.numero);
  }

  async pagarComPix() {
    await this.abaPix.click();
  }

  async preencherCartao(c: Cartao) {
    await this.abaCartao.click();
    await this.cartaoNumero.fill(c.numero);
    await this.cartaoTitular.fill(c.titular);
    await this.cartaoValidade.fill(c.validade);
    await this.cartaoCvv.fill(c.cvv);
  }

  async confirmar() {
    await this.finalizar.click();
  }

  // Clica em finalizar e devolve o que a API respondeu ao POST /api/orders, para o spec conferir.
  // Por que route.fetch: a loja redireciona para o painel no instante em que recebe a resposta,
  // e o navegador descarta o corpo antes de o teste conseguir lê-lo. Interceptando, o pedido
  // vai DE VERDADE para a API (route.fetch), guardamos a resposta e entregamos a mesma
  // resposta para a loja (route.fulfill). Continua sem expect: quem verifica é o spec.
  async confirmarPedido(): Promise<{ status: number; corpo: PedidoCriado }> {
    const pedido = new Promise<{ status: number; corpo: PedidoCriado }>((resolve) => {
      this.page.route(
        '**/api/orders',
        async (route) => {
          const resposta = await route.fetch();
          resolve({ status: resposta.status(), corpo: await resposta.json() });
          await route.fulfill({ response: resposta });
        },
        { times: 1 }, // só o próximo pedido; depois a rede volta ao normal
      );
    });
    await this.finalizar.click();
    return pedido;
  }

  // No painel, cada pedido da lista mostra o id completo numa etiqueta
  pedidoNaLista(id: string): Locator {
    return this.page.getByText(id, { exact: true });
  }

  // Converte o texto da tela em número: "R$ 1.275,41" -> 1275.41
  async valor(campo: Locator): Promise<number> {
    const texto = await campo.innerText();
    return Number(texto.replace(/[^\d,]/g, '').replace(',', '.'));
  }
}
