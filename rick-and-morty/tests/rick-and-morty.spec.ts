// rick-and-morty/tests/rick-and-morty.spec.ts — Desafio de mercado API: Rick and Morty API (CT-EXT-02).
// API pública, sem token: https://rickandmortyapi.com/api
// Cada chamada imprime no console o endereço, o STATUS, o CONTENT-TYPE e o JSON, para a banca acompanhar.
// Rodar: npm run test:rm      (ou npm run test:rm:ui para ver cada requisição na interface)
import { APIResponse } from '@playwright/test';
import { test, expect } from '../fixtures/rick-and-morty.fixture';
import type { Episodio, ErroApi, Pagina, Personagem } from '../api/RickAndMortyApi';
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
} from '../data/rick-and-morty.data';

// Imprime a chamada para a banca. "resumo" encurta respostas grandes (ex.: 51 links de episódios).
async function log(nome: string, res: APIResponse, resumo?: unknown) {
  console.log(`\n▶ ${nome}`);
  console.log(`  GET ${res.url()}`);
  console.log(`  STATUS: ${res.status()} ${res.statusText()} · CONTENT-TYPE: ${res.headers()['content-type']}`);
  console.log(JSON.stringify(resumo ?? (await res.json()), null, 2));
}

// SCRUM-24 · US-04
test.describe('CT-EXT-02 · Rick and Morty API', () => {
  test('CT-EXT-02.1 · busca o Rick pelo id (200) e valida o contrato', async ({ rickApi }) => {
    const res = await rickApi.personagem(RICK.id);
    const rick: Personagem = await res.json();
    await log('CT-EXT-02.1 · personagem 1', res, { ...rick, episode: `[${rick.episode.length} episódios]` });

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

  test('CT-EXT-02.2 · filtro por nome e status devolve só Ricks vivos', async ({ rickApi }) => {
    const res = await rickApi.buscarPersonagens(FILTRO_RICKS_VIVOS);
    const pagina: Pagina<Personagem> = await res.json();
    await log('CT-EXT-02.2 · ?name=rick&status=alive', res, {
      info: pagina.info,
      results: pagina.results.map((p) => `${p.id} · ${p.name} (${p.status})`),
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

  test('CT-EXT-02.3 · paginação: a página 2 traz os ids 21 a 40', async ({ rickApi }) => {
    const res = await rickApi.buscarPersonagens({ page: PAGINA_2.numero });
    const pagina: Pagina<Personagem> = await res.json();
    await log('CT-EXT-02.3 · ?page=2', res, { info: pagina.info, ids: pagina.results.map((p) => p.id) });

    expect(res.status()).toBe(200);
    expect(pagina.results).toHaveLength(TAMANHO_PAGINA);
    expect(pagina.results[0].id).toBe(PAGINA_2.primeiroId);
    expect(pagina.results.at(-1)!.id).toBe(PAGINA_2.ultimoId);
    // Os links de navegação apontam para as páginas vizinhas
    expect(pagina.info.prev).toContain('page=1');
    expect(pagina.info.next).toContain('page=3');
  });

  test('CT-EXT-02.4 · encadeia chamadas: o 1º episódio do Rick é o Pilot', async ({ rickApi }) => {
    // 1ª chamada: o personagem traz os links dos episódios
    const rick: Personagem = await (await rickApi.personagem(RICK.id)).json();
    // 2ª chamada: segue o primeiro link que a própria API devolveu
    const res = await rickApi.seguir(rick.episode[0]);
    const episodio: Episodio = await res.json();
    await log('CT-EXT-02.4 · seguindo o link do 1º episódio do Rick', res, {
      ...episodio,
      characters: `[${episodio.characters.length} personagens]`,
    });

    expect(res.status()).toBe(200);
    expect(episodio).toMatchObject(PILOTO);
    expect(episodio.characters, 'o Rick tem de aparecer no próprio episódio').toContain(rick.url);
  });

  test('CT-EXT-02.5 · vários ids numa chamada devolvem a família Smith', async ({ rickApi }) => {
    const res = await rickApi.variosPersonagens(FAMILIA_SMITH.map((p) => p.id));
    const lista: Personagem[] = await res.json();
    await log('CT-EXT-02.5 · personagens 1,2,3', res, lista.map((p) => ({ id: p.id, name: p.name })));

    expect(res.status()).toBe(200);
    expect(Array.isArray(lista)).toBe(true);
    expect(lista.map((p) => ({ id: p.id, name: p.name }))).toEqual(FAMILIA_SMITH);
  });

  test('CT-EXT-02.6 · id inexistente retorna 404', async ({ rickApi }) => {
    const res = await rickApi.personagem(ID_INEXISTENTE);
    await log('CT-EXT-02.6 · personagem 999999', res);

    expect(res.status()).toBe(404);
    expect(res.headers()['content-type']).toContain('application/json');
    expect(((await res.json()) as ErroApi).error).toBe(MENSAGENS.personagemNaoEncontrado);
  });

  test('CT-EXT-02.7 · busca sem resultado retorna 404', async ({ rickApi }) => {
    const res = await rickApi.buscarPersonagens({ name: NOME_INEXISTENTE });
    await log('CT-EXT-02.7 · ?name=zzzzzz', res);

    expect(res.status()).toBe(404);
    expect(((await res.json()) as ErroApi).error).toBe(MENSAGENS.nadaEncontrado);
  });

  test('CT-EXT-02.8 · [achado] id inválido deveria retornar 400', async ({ rickApi }) => {
    // Achado nosso na API pública: "abc" não é um id, ou seja, é erro de quem chama (4xx).
    // A API responde 500 (erro do servidor). test.fail documenta: hoje falha como esperado.
    test.fail(true, 'A Rick and Morty API responde 500 para id que não é número; o correto seria 400');
    const res = await rickApi.personagem(ID_INVALIDO);
    await log('CT-EXT-02.8 · personagem "abc"', res);

    expect(((await res.json()) as ErroApi).error).toBe(MENSAGENS.idObrigatorio);
    expect(res.status(), 'entrada inválida é erro do cliente: 400').toBe(400);
  });
});
