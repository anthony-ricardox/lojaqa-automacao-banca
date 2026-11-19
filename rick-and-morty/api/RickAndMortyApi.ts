// rick-and-morty/api/RickAndMortyApi.ts — "API Object" da Rick and Morty API.
// É o primo do Page Object, só que para API: guarda COMO chamar cada endpoint.
// Regra igual à do Page Object: nenhum expect aqui. Quem verifica a resposta é o spec.
// Se um endpoint mudar de caminho, conserta-se só aqui.
import { APIRequestContext, APIResponse } from '@playwright/test';

// Tipos = o contrato da API. O TypeScript avisa se o teste usar um campo que não existe.
export type Personagem = {
  id: number;
  name: string;
  status: 'Alive' | 'Dead' | 'unknown';
  species: string;
  type: string;
  gender: string;
  origin: { name: string; url: string };
  location: { name: string; url: string };
  image: string;
  episode: string[]; // URLs dos episódios em que aparece
  url: string;
  created: string;
};

export type Episodio = { id: number; name: string; air_date: string; episode: string; characters: string[]; url: string };

// Local (planeta, estação...): "residents" traz os LINKS dos personagens que moram lá
export type Local = { id: number; name: string; type: string; dimension: string; residents: string[]; url: string; created: string };

// Listas vêm paginadas: "info" diz quantos existem e onde estão as páginas vizinhas
export type Pagina<T> = {
  info: { count: number; pages: number; next: string | null; prev: string | null };
  results: T[];
};

export type ErroApi = { error: string };

export type Filtros = { name?: string; status?: 'alive' | 'dead' | 'unknown'; species?: string; page?: number };

export class RickAndMortyApi {
  // Recebe o cliente HTTP do Playwright (a fixture { request }); a baseURL vem do playwright.config.ts
  constructor(private readonly request: APIRequestContext) {}

  /** GET /character/{id}: um personagem */
  personagem(id: number | string): Promise<APIResponse> {
    return this.request.get(`character/${id}`);
  }

  /** GET /character/1,2,3: vários personagens numa chamada só (devolve um array) */
  variosPersonagens(ids: number[]): Promise<APIResponse> {
    return this.request.get(`character/${ids.join(',')}`);
  }

  /** GET /character/?name=...&status=...&page=...: busca com filtros e paginação */
  buscarPersonagens(filtros: Filtros): Promise<APIResponse> {
    // Remove filtros vazios para não mandar "name=undefined" na URL
    const params = Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor !== undefined));
    return this.request.get('character/', { params: params as Record<string, string | number> });
  }

  /** GET /location/{id}: um local e os links dos seus moradores */
  local(id: number): Promise<APIResponse> {
    return this.request.get(`location/${id}`);
  }

  /** Segue uma URL que a própria API devolveu (ex.: o link do 1º episódio de um personagem) */
  seguir(url: string): Promise<APIResponse> {
    return this.request.get(url);
  }
}
