// rick-and-morty/tests/rick-and-morty.spec.ts — Desafio de mercado API: Rick and Morty API (CT-EXT-02).
// API pública, sem token: https://rickandmortyapi.com/api
// Cada chamada passa pela vitrine: imprime no console o endereço, o STATUS, o CONTENT-TYPE e o JSON,
// e mostra um card com as fotos na tela do UI Mode (ou na janela, com --headed). Quem valida é o expect.
// Rodar: npm run test:rm  ·  npm run test:rm:ui (UI Mode)  ·  npm run test:rm:vitrine (janela ao vivo)
import { test, expect } from '../fixtures/rick-and-morty.fixture';
import type { Episodio, ErroApi, Local, Pagina, Personagem } from '../api/RickAndMortyApi';
import {
  FAMILIA_SMITH,
  FILTRO_RICKS_VIVOS,
  ID_INEXISTENTE,
  ID_INVALIDO,
  MENSAGENS,
  NOME_INEXISTENTE,
  PAGINA_2,
  PILOTO,
  RICK,
  TAMANHO_PAGINA,
  TERRA_C137,
} from '../data/rick-and-morty.data';

// SCRUM-24 · US-04
// "esperado" e "resumo" só mudam o que a vitrine mostra; quem decide se passou são os expects.
test.describe('CT-EXT-02 · Rick and Morty API', () => {
  test('CT-EXT-02.1 · busca o Rick pelo id (200) e valida o contrato', async ({ rickApi, vitrine }) => {
    const res = await rickApi.personagem(RICK.id);
    const rick: Personagem = await res.json();
    await vitrine.mostrar('CT-EXT-02.1 · personagem 1', res, {
      esperado: 200,
      resumo: { ...rick, episode: `[${rick.episode.length} episódios]` },
    });

    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/json');
    // Os dados certos...
    expect(rick).toMatchObject({ id: RICK.id, name: RICK.name, status: RICK.status, species: RICK.species });
    expect(rick.origin.name).toBe(RICK.origem);
    // ...e o contrato: cada campo existe e tem o tipo esperado
    expect(rick).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: expect.any(String),
        image: expect.stringMatching(/\.jpeg$/),
        episode: expect.any(Array),
        created: expect.any(String),
      }),
    );
    expect(rick.episode.length).toBeGreaterThan(0);
  });

  test('CT-EXT-02.2 · filtro por nome e status devolve só Ricks vivos', async ({ rickApi, vitrine }) => {
    const res = await rickApi.buscarPersonagens(FILTRO_RICKS_VIVOS);
    const pagina: Pagina<Personagem> = await res.json();
    await vitrine.mostrar('CT-EXT-02.2 · ?name=rick&status=alive', res, {
      esperado: 200,
      resumo: { info: pagina.info, results: pagina.results.map((p) => `${p.id} · ${p.name} (${p.status})`) },
    });

    expect(res.status()).toBe(200);
    expect(pagina.info.count).toBeGreaterThan(0);
    expect(pagina.results.length).toBeGreaterThan(0);
    // Cada resultado tem de obedecer aos DOIS filtros
    for (const p of pagina.results) {
      expect.soft(p.name, `${p.name} deveria conter "rick"`).toMatch(/rick/i);
      expect.soft(p.status, `${p.name} deveria estar vivo`).toBe('Alive');
    }
  });

  test('CT-EXT-02.3 · paginação: a página 2 traz os ids 21 a 40', async ({ rickApi, vitrine }) => {
    const res = await rickApi.buscarPersonagens({ page: PAGINA_2.numero });
    const pagina: Pagina<Personagem> = await res.json();
    await vitrine.mostrar('CT-EXT-02.3 · ?page=2', res, {
      esperado: 200,
      resumo: { info: pagina.info, ids: pagina.results.map((p) => p.id) },
    });

    expect(res.status()).toBe(200);
    expect(pagina.results).toHaveLength(TAMANHO_PAGINA);
    expect(pagina.results[0].id).toBe(PAGINA_2.primeiroId);
    expect(pagina.results.at(-1)!.id).toBe(PAGINA_2.ultimoId);
    // Os links de navegação apontam para as páginas vizinhas
    expect(pagina.info.prev).toContain('page=1');
    expect(pagina.info.next).toContain('page=3');
  });

  test('CT-EXT-02.4 · encadeia chamadas: o 1º episódio do Rick é o Pilot', async ({ rickApi, vitrine }) => {
    // 1ª chamada: o personagem traz os links dos episódios
    const rick: Personagem = await (await rickApi.personagem(RICK.id)).json();
    // 2ª chamada: segue o primeiro link que a própria API devolveu
    const res = await rickApi.seguir(rick.episode[0]);
    const episodio: Episodio = await res.json();
    await vitrine.mostrar('CT-EXT-02.4 · seguindo o link do 1º episódio do Rick', res, {
      esperado: 200,
      resumo: { ...episodio, characters: `[${episodio.characters.length} personagens]` },
    });

    expect(res.status()).toBe(200);
    expect(episodio).toMatchObject(PILOTO);
    expect(episodio.characters, 'o Rick tem de aparecer no próprio episódio').toContain(rick.url);
  });

  test('CT-EXT-02.5 · vários ids numa chamada devolvem a família Smith', async ({ rickApi, vitrine }) => {
    const res = await rickApi.variosPersonagens(FAMILIA_SMITH.map((p) => p.id));
    const lista: Personagem[] = await res.json();
    await vitrine.mostrar('CT-EXT-02.5 · personagens 1,2,3', res, {
      esperado: 200,
      resumo: lista.map((p) => ({ id: p.id, name: p.name })),
    });

    expect(res.status()).toBe(200);
    expect(Array.isArray(lista)).toBe(true);
    expect(lista.map((p) => ({ id: p.id, name: p.name }))).toEqual(FAMILIA_SMITH);
  });

  test('CT-EXT-02.6 · id inexistente retorna 404', async ({ rickApi, vitrine }) => {
    const res = await rickApi.personagem(ID_INEXISTENTE);
    await vitrine.mostrar('CT-EXT-02.6 · personagem 999999', res, { esperado: 404 });

    expect(res.status()).toBe(404);
    expect(res.headers()['content-type']).toContain('application/json');
    expect(((await res.json()) as ErroApi).error).toBe(MENSAGENS.personagemNaoEncontrado);
  });

  test('CT-EXT-02.7 · busca sem resultado retorna 404', async ({ rickApi, vitrine }) => {
    const res = await rickApi.buscarPersonagens({ name: NOME_INEXISTENTE });
    await vitrine.mostrar('CT-EXT-02.7 · ?name=zzzzzz', res, { esperado: 404 });

    expect(res.status()).toBe(404);
    expect(((await res.json()) as ErroApi).error).toBe(MENSAGENS.nadaEncontrado);
  });

  test('CT-EXT-02.8 · [achado] id inválido deveria retornar 400', async ({ rickApi, vitrine }) => {
    // Achado nosso na API pública: "abc" não é um id, ou seja, é erro de quem chama (4xx).
    // A API responde 500 (erro do servidor). test.fail documenta: hoje falha como esperado.
    test.fail(true, 'A Rick and Morty API responde 500 para id que não é número; o correto seria 400');
    const res = await rickApi.personagem(ID_INVALIDO);
    await vitrine.mostrar('CT-EXT-02.8 · personagem "abc"', res, { esperado: 400 });

    expect(((await res.json()) as ErroApi).error).toBe(MENSAGENS.idObrigatorio);
    expect(res.status(), 'entrada inválida é erro do cliente: 400').toBe(400);
  });

  // ===== DEMO AO VIVO: prova de que a vitrine é em tempo real =====
  // Na banca: selecione as linhas abaixo, descomente (Ctrl+K Ctrl+U), salve e rode
  //   npx playwright test --project=rick-and-morty -g "02.9" --headed
  // Um card novo aparece com os moradores da Terra (C-137), vindos da API naquele instante.
  // Depois, comente de novo (Ctrl+K Ctrl+C): fora da demo a suíte continua com 8 casos.
  //
  // test('CT-EXT-02.9 · local: a Terra (C-137) e os seus moradores', async ({ rickApi, vitrine }) => {
  //   const res = await rickApi.local(TERRA_C137.id);
  //   const local: Local = await res.json();
  //   await vitrine.mostrar('CT-EXT-02.9 · local 1', res, { esperado: 200 });
  //
  //   expect(res.status()).toBe(200);
  //   expect(local).toMatchObject(TERRA_C137);
  //   expect(local.residents.length).toBeGreaterThan(0);
  //   // Cada morador é um link para um personagem (é dele que a vitrine tira as fotos)
  //   for (const link of local.residents) {
  //     expect.soft(link).toMatch(/\/api\/character\/\d+$/);
  //   }
  //. });
});
