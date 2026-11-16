// data/checkout.data.ts — massa de dados do checkout (o "o quê" que vai nos campos).
// Separada do teste: para trocar produto, CEP, cartão ou mensagem esperada, muda-se só aqui.
// Usada pelo spec E2E (tela) e pelo spec de API. Dono: André (SCRUM-22).
import type { Cartao, Entrega } from '../pages/CheckoutPage';

// ===================== Massa da TELA (E2E) =====================

// R$ 289,90 → subtotal ≥ R$ 250 dá PAC grátis, então o total não tem frete somado
export const PRODUTO = 'Teclado Mecânico Aurora RGB';

// CPF fictício com dígitos verificadores válidos + CEP real da Av. Paulista (ViaCEP responde)
export const entrega: Entrega = { cpf: '52998224725', cep: '01310100', numero: '1000' };

// Números de cartão de TESTE públicos (não são cartões reais)
export const cartoes: Record<'visa' | 'master' | 'incompleto' | 'vencido', Cartao> = {
  visa: { numero: '4111111111111111', titular: 'BANCA FAP', validade: '1230', cvv: '123' },
  master: { numero: '5555555555554444', titular: 'BANCA FAP', validade: '1230', cvv: '123' },
  incompleto: { numero: '411111111111', titular: 'BANCA FAP', validade: '1230', cvv: '123' }, // 12 dígitos
  vencido: { numero: '4111111111111111', titular: 'BANCA FAP', validade: '0120', cvv: '123' }, // 01/20
};

// ===================== Massa da API (POST /api/orders) =====================

// Endereço no mesmo formato que a loja envia (o contrato aceita até 300 caracteres)
export const enderecoApi = 'Av. Paulista, 1000 - Bela Vista, São Paulo/SP (CEP: 01310-100)';

// Mensagens exatas que a API devolve (conferidas na API real em 15/11/2026).
// Se a API mudar um texto, conserta-se aqui e todos os testes acompanham.
export const mensagensApi = {
  pedidoCriado: 'Pedido criado com sucesso.',
  semItensOuEndereco: 'Itens e endereço de entrega são obrigatórios.',
  quantidadeInvalida: 'Produto ou quantidade inválida.',
  semToken: 'Token não fornecido.',
  tokenInvalido: 'Token inválido ou expirado.',
  estoqueInsuficiente: 'Estoque insuficiente para', // + " <nome do produto>."
};
