// rick-and-morty/data/rick-and-morty.data.ts — massa de dados dos testes da Rick and Morty API.
// Valores conferidos na API real em 13/11/2026 e 15/11/2026. Mudou algo na API? Conserta-se só aqui.

// Personagem 1: o mais conhecido da série
export const RICK = {
  id: 1,
  name: 'Rick Sanchez',
  status: 'Alive',
  species: 'Human',
  origem: 'Earth (C-137)',
} as const;

// Os três primeiros ids da API: a família Smith
export const FAMILIA_SMITH = [
  { id: 1, name: 'Rick Sanchez' },
  { id: 2, name: 'Morty Smith' },
  { id: 3, name: 'Summer Smith' },
];

// Filtro combinado: nome contém "rick" E status = vivo
export const FILTRO_RICKS_VIVOS = { name: 'rick', status: 'alive' } as const;

// A API pagina de 20 em 20: a página 2 vai do id 21 ao 40
export const TAMANHO_PAGINA = 20;
export const PAGINA_2 = { numero: 2, primeiroId: 21, ultimoId: 40 };

// O primeiro episódio da série
export const PILOTO = { name: 'Pilot', episode: 'S01E01', air_date: 'December 2, 2013' };

// Local 1: a Terra de origem do Rick (conferido na API real em 18/11/2026: 27 moradores)
export const TERRA_C137 = { id: 1, name: 'Earth (C-137)', type: 'Planet', dimension: 'Dimension C-137' } as const;

// Cenários negativos
export const ID_INEXISTENTE = 999999;
export const NOME_INEXISTENTE = 'zzzzzz';
export const ID_INVALIDO = 'abc';

// Mensagens de erro exatas da API
export const MENSAGENS = {
  personagemNaoEncontrado: 'Character not found',
  nadaEncontrado: 'There is nothing here',
  idObrigatorio: 'Hey! you must provide an id',
};
