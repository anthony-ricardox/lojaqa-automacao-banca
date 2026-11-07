// pages/CheckoutPage.ts — Page Object do checkout (o "controle remoto" da tela).
// Guarda COMO interagir com a página: onde está cada elemento e quais ações existem.
// REGRA DA RUBRICA: nenhum expect aqui. O Page Object só age; quem verifica é o spec.
// Se um campo mudar de nome na loja, conserta-se só aqui.
import { Page, Locator } from '@playwright/test';

// Tipos deixam o TypeScript avisar se faltar um campo na massa de dados
export type Cartao = { numero: string; titular: string; validade: string; cvv: string };
export type Entrega = { cpf: string; cep: string; numero: string };

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

    // Campos: getByTestId lê o atributo id (configurado no playwright.config.ts)
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
    await this.page.locator('article').filter({ hasText: nome })
      .getByRole('button', { name: 'Adicionar ao carrinho' }).click();
    await this.abrirCarrinho.click();
    await this.continuarCheckout.click();
  }

  async preencherEntrega(d: Entrega) {
    await this.cpf.fill(d.cpf);
    // O CEP com 8 dígitos dispara a consulta ao ViaCEP. Em vez de "esperar X segundos"
    // (proibido: waitForTimeout), esperamos a RESPOSTA da requisição chegar.
    const viaCep = this.page.waitForResponse(r => r.url().includes('viacep.com.br/ws/'));
    await this.cep.fill(d.cep);
    await viaCep;
    await this.numero.fill(d.numero);
  }

  async pagarComPix() { await this.abaPix.click(); }

  async preencherCartao(c: Cartao) {
    await this.abaCartao.click();
    await this.cartaoNumero.fill(c.numero);
    await this.cartaoTitular.fill(c.titular);
    await this.cartaoValidade.fill(c.validade);
    await this.cartaoCvv.fill(c.cvv);
  }

  async confirmar() { await this.finalizar.click(); }

  // Converte o texto da tela em número: "R$ 1.275,41" -> 1275.41
  async valor(campo: Locator): Promise<number> {
    const texto = await campo.innerText();
    return Number(texto.replace(/[^\d,]/g, '').replace(',', '.'));
  }
}
