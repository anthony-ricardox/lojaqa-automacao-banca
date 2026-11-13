// data/checkout.data.ts — massa de dados do checkout (o "o quê" que vai nos campos).
// Separada do teste: para trocar produto, CEP ou cartão, muda-se só aqui.
// Dono do arquivo: André (SCRUM-22). Criado por Anthony para destravar o E2E;
// André revisa e pode acrescentar dados para a API.
import type { Cartao, Entrega } from '../pages/CheckoutPage';

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
