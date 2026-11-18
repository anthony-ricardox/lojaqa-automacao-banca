// rick-and-morty/vitrine/Vitrine.ts — mostra cada resposta da API numa tela, para a banca VER o que voltou.
// Teste de API não abre navegador, então o UI Mode fica com a tela preta. A vitrine é uma página
// só de exibição: a cada chamada, monta um card com o status, as fotos e o JSON da resposta.
// Regra igual à do API Object: nenhum expect aqui. Quem valida continua sendo o spec, direto na resposta.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { APIResponse, Page, test } from '@playwright/test';

// As fotos vêm do MESMO servidor da API. Muitas fotos de uma vez estouram o limite de requisições
// (429) e derrubariam os testes. Por isso: no máximo 6 fotos por card, e cada foto fica guardada
// no disco (pasta temporária do Windows) e só é baixada uma vez.
const MAX_FOTOS = 6;
const PASTA_CACHE = path.join(os.tmpdir(), 'vitrine-rick-and-morty');

export type OpcoesVitrine = {
  /** Status que o teste espera. O card mostra ✓ quando bate e ✗ quando não bate. */
  esperado?: number;
  /** Versão curta do JSON (ex.: troca 51 links de episódios por "[51 episódios]"). */
  resumo?: unknown;
};

type Foto = { src: string; legenda: string };
type Chamada = {
  titulo: string;
  url: string;
  status: number;
  tipo: string;
  esperado?: number;
  fotos: Foto[];
  json: string;
};

export class Vitrine {
  private readonly chamadas: Chamada[] = [];

  // page = null quando a vitrine está desligada (VITRINE=0 no .env): aí só imprime no console
  constructor(private readonly page: Page | null) {}

  /** Liga a vitrine numa página: as fotos passam pelo cache em disco antes de ir à API. */
  static async abrir(page: Page): Promise<Vitrine> {
    await page.route('**/character/avatar/*.jpeg', async (route) => {
      const arquivo = path.join(PASTA_CACHE, path.basename(new URL(route.request().url()).pathname));
      if (fs.existsSync(arquivo)) return route.fulfill({ path: arquivo }); // já baixada: nem sai do PC
      const resposta = await route.fetch();
      if (resposta.ok()) {
        fs.mkdirSync(PASTA_CACHE, { recursive: true });
        fs.writeFileSync(arquivo, await resposta.body());
      }
      await route.fulfill({ response: resposta });
    });
    return new Vitrine(page);
  }

  /** Imprime a chamada no console e, com a vitrine ligada, mostra o card dela na tela. */
  async mostrar(titulo: string, res: APIResponse, { esperado, resumo }: OpcoesVitrine = {}) {
    const corpo: unknown = await res.json().catch(() => null);
    const json = JSON.stringify(resumo ?? corpo, null, 2);
    const tipo = res.headers()['content-type'] ?? '';

    console.log(`\n▶ ${titulo}`);
    console.log(`  GET ${res.url()}`);
    console.log(`  STATUS: ${res.status()} ${res.statusText()} · CONTENT-TYPE: ${tipo}`);
    console.log(json);

    const page = this.page;
    if (!page) return;
    this.chamadas.push({ titulo, url: res.url(), status: res.status(), tipo, esperado, fotos: fotosDe(corpo), json });
    // O passo ganha nome próprio: no UI Mode, clique nele para ver a tela daquele momento
    await test.step(`Vitrine · ${titulo} → ${res.status()}`, async () => {
      await page.setContent(montarPagina(this.chamadas), { waitUntil: 'load' }); // 'load' espera as fotos
    });
  }
}

const eObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

// Acha as fotos na resposta, seja qual for o formato que a API devolveu:
//   personagem → { image }   ·   página → { results: [{ image }] }   ·   vários ids → [{ image }]
//   episódio → só traz os LINKS dos personagens; a foto de cada um fica em /character/avatar/{id}.jpeg
function fotosDe(corpo: unknown): Foto[] {
  const itens: unknown[] = Array.isArray(corpo)
    ? corpo
    : eObjeto(corpo) && Array.isArray(corpo.results)
      ? corpo.results
      : [corpo];
  const fotos = itens
    .filter(eObjeto)
    .filter((p) => typeof p.image === 'string')
    .map((p) => ({ src: String(p.image), legenda: String(p.name ?? '') }));
  if (fotos.length > 0 || !eObjeto(corpo) || !Array.isArray(corpo.characters)) return fotos;
  return corpo.characters.map((link: string) => ({
    src: `${link.replace('/character/', '/character/avatar/')}.jpeg`,
    legenda: `#${link.split('/').pop()}`,
  }));
}

// ===== Daqui para baixo é só o desenho da tela (HTML + CSS) =====

const SIGNIFICADO: Record<number, string> = {
  2: 'sucesso',
  3: 'redirecionamento',
  4: 'erro de quem chamou',
  5: 'erro do servidor',
};
const faixa = (status: number) => Math.floor(status / 100); // 200 → 2, 404 → 4, 500 → 5
const bateu = (c: Chamada) => (c.esperado === undefined ? c.status < 400 : c.status === c.esperado);
const esc = (s: string) =>
  s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);

function blocoFotos(c: Chamada): string {
  const figura = (f: Foto) => `<figure><img src="${esc(f.src)}" alt=""><figcaption>${esc(f.legenda)}</figcaption></figure>`;
  if (c.fotos.length === 1) return `<div class="fotos uma">${figura(c.fotos[0])}</div>`;
  if (c.fotos.length > 1) {
    const resto = c.fotos.length - MAX_FOTOS;
    const mais = resto > 0 ? `<p class="mais">+ ${resto} nesta resposta (${c.fotos.length} no total)</p>` : '';
    return `<div class="fotos"><div class="grade">${c.fotos.slice(0, MAX_FOTOS).map(figura).join('')}</div>${mais}</div>`;
  }
  return `<div class="fotos vazia c${faixa(c.status)}"><b>${c.status}</b><span>esta resposta não traz fotos</span></div>`;
}

function veredito(c: Chamada): string {
  if (c.esperado === undefined) return '';
  return bateu(c)
    ? `<span class="ok">✓ esperado ${c.esperado}</span>`
    : `<span class="nao">✗ esperado ${c.esperado}, veio ${c.status}</span>`;
}

// Os detalhes de TODAS as chamadas ficam na página; só o da selecionada aparece (classe "visivel").
function blocoDetalhe(c: Chamada, i: number, visivel: boolean): string {
  const [id, ...resto] = c.titulo.split(' · ');
  return `<section class="atual${visivel ? ' visivel' : ''}" id="c${i}">
    <div class="topo">
      <h1><small>${esc(id)}</small>${esc(resto.join(' · '))}</h1>
      <code class="url">GET ${esc(c.url)}</code>
      <div class="selos"><span class="st c${faixa(c.status)}">${c.status} · ${SIGNIFICADO[faixa(c.status)] ?? ''}</span>
        ${veredito(c)}<span class="tipo">${esc(c.tipo)}</span></div>
    </div>
    <div class="corpo">${blocoFotos(c)}<pre>${esc(c.json)}</pre></div>
  </section>`;
}

function itemHistorico(c: Chamada, i: number, selecionado: boolean): string {
  const [id, ...resto] = c.titulo.split(' · ');
  const miniatura = c.fotos[0] ? `<img src="${esc(c.fotos[0].src)}" alt="">` : `<span class="sem">${c.status}</span>`;
  return `<li class="${selecionado ? 'agora' : ''}" data-alvo="c${i}">${miniatura}
    <span class="nome"><b>${esc(id)}</b><br>${esc(resto.join(' · '))}</span>
    <span class="st c${faixa(c.status)}">${c.status}</span>
    <span class="${bateu(c) ? 'ok' : 'nao'}">${bateu(c) ? '✓' : '✗'}</span></li>`;
}

// Clicar numa chamada do histórico troca os detalhes mostrados (para analisar depois que os testes terminam)
const SCRIPT = `
document.querySelectorAll('li[data-alvo]').forEach((li) => li.addEventListener('click', () => {
  document.querySelectorAll('.atual').forEach((s) => s.classList.toggle('visivel', s.id === li.dataset.alvo));
  document.querySelectorAll('li[data-alvo]').forEach((x) => x.classList.toggle('agora', x === li));
}));`;

function montarPagina(chamadas: Chamada[]): string {
  const ultima = chamadas.length - 1; // a chamada que acabou de acontecer começa selecionada
  const certas = chamadas.filter(bateu).length;
  const erradas = chamadas.length - certas;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Vitrine · Rick and Morty API</title><style>${CSS}</style></head><body>
<header><span class="ponto"></span><b>Rick and Morty API</b> · ao vivo
  <span class="placar">${chamadas.length} ${chamadas.length === 1 ? 'chamada' : 'chamadas'} · <span class="ok">✓ ${certas}</span>${
    erradas ? ` · <span class="nao">✗ ${erradas}</span>` : ''
  }</span></header>
<main>
  ${chamadas.map((c, i) => blocoDetalhe(c, i, i === ultima)).join('')}
  <aside><h2>Chamadas desta execução</h2><p class="dica">Clique numa chamada para ver os detalhes</p>
    <ol>${chamadas.map((c, i) => itemHistorico(c, i, i === ultima)).join('')}</ol></aside>
</main><script>${SCRIPT}</script></body></html>`;
}

// Responsivo: a fonte base acompanha a largura da tela (com mínimo e máximo) e tudo é medido
// em rem, vw e vh. As fotos ocupam uma fração da tela, então crescem em monitor grande e
// encolhem em tela pequena. Abaixo de 900 px de largura, o histórico desce para baixo dos detalhes.
const CSS = `
*{box-sizing:border-box;margin:0}
html{font-size:clamp(13px,0.5vw + 8.6px,22px)}
body{background:#091217;color:#E8EEF0;font:1rem/1.4 "Segoe UI",system-ui,sans-serif;height:100vh;display:flex;flex-direction:column;overflow:hidden}
header{display:flex;align-items:center;gap:.65rem;padding:1rem 1.8rem;border-bottom:1px solid #1E2E36;font-size:1.2rem}
.ponto{width:.8rem;height:.8rem;border-radius:50%;background:#97CE4C;box-shadow:0 0 .8rem #97CE4C}
.placar{margin-left:auto;color:#8FA3AD;font-size:1rem}
main{flex:1;display:grid;grid-template-columns:minmax(0,1fr) clamp(15rem,24vw,26rem);min-height:0}
.atual{padding:1.4rem 1.8rem;display:none;flex-direction:column;gap:1.2rem;min-height:0;grid-row:1;grid-column:1}
.atual.visivel{display:flex}
.topo{display:flex;flex-direction:column;gap:.5rem}
h1{font-size:2rem;font-weight:650;line-height:1.15}
h1 small{display:block;font-size:.95rem;font-weight:600;letter-spacing:.06em;color:#97CE4C;margin-bottom:.25rem}
.url{font:.95rem/1.3 Consolas,monospace;color:#9FC3D1;word-break:break-all}
.selos{display:flex;gap:.9rem;align-items:center;flex-wrap:wrap}
.st{font-weight:700;padding:.25rem .8rem;border-radius:999px;font-size:1rem;color:#091217;white-space:nowrap}
.st.c2{background:#97CE4C}.st.c3{background:#8FB3C2}.st.c4{background:#E8B44A}.st.c5{background:#FF6B5E}
.tipo{color:#8FA3AD;font-size:.95rem}
.ok{color:#97CE4C;font-weight:600}.nao{color:#FF6B5E;font-weight:600}
.corpo{flex:1;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:1.6rem;min-height:0}
figure{margin:0;min-width:0}
.uma img{width:min(100%,46vh);aspect-ratio:1;height:auto;object-fit:cover;border-radius:1.2rem;display:block}
.uma figcaption{margin-top:.65rem;font-size:1.35rem;font-weight:600}
.grade{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.9rem;max-width:min(100%,68vh);align-content:start}
.grade img{width:100%;aspect-ratio:1;height:auto;object-fit:cover;border-radius:.8rem;display:block}
.grade figcaption{font-size:.85rem;color:#B9CBD2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:.3rem}
.mais{margin-top:.9rem;color:#8FA3AD;font-size:.95rem}
.vazia{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.4rem;height:clamp(12rem,32vh,24rem);border:1px dashed #2A3D47;border-radius:1.2rem;color:#8FA3AD}
.vazia b{font-size:5.5rem;line-height:1}
.vazia.c2 b{color:#97CE4C}.vazia.c4 b{color:#E8B44A}.vazia.c5 b{color:#FF6B5E}
pre{background:#0F1D23;border:1px solid #1E2E36;border-radius:.8rem;padding:.9rem 1rem;font:.85rem/1.45 Consolas,monospace;color:#CFE3EA;overflow:auto;min-height:0;white-space:pre-wrap;word-break:break-all}
aside{border-left:1px solid #1E2E36;padding:1.2rem 1rem;overflow:auto;grid-row:1;grid-column:2}
aside h2{font-size:.8rem;letter-spacing:.08em;text-transform:uppercase;color:#8FA3AD}
.dica{font-size:.8rem;color:#6F8590;margin:.25rem 0 .8rem}
ol{list-style:none;padding:0;display:flex;flex-direction:column;gap:.5rem}
li{display:grid;grid-template-columns:2.6rem minmax(0,1fr) auto auto;gap:.65rem;align-items:center;padding:.55rem .65rem;border-radius:.65rem;background:#0F1D23;border:1px solid transparent;font-size:.87rem;line-height:1.25;cursor:pointer}
li:hover{border-color:#2A3D47}
li.agora{border-color:#8FA3AD;background:#152730}
li img,li .sem{width:2.6rem;height:2.6rem;border-radius:.5rem;display:block;object-fit:cover}
li .sem{display:grid;place-items:center;background:#1E2E36;color:#8FA3AD;font-size:.8rem;font-weight:700}
li .nome{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#B9CBD2}
li .nome b{color:#E8EEF0}
li .st{font-size:.8rem;padding:.12rem .5rem}
@media (max-width:900px){
  body{height:auto;min-height:100vh;overflow:auto}
  header{padding:.9rem 1rem}
  main{grid-template-columns:minmax(0,1fr)}
  .atual{padding:1.2rem 1rem}
  aside{grid-row:2;grid-column:1;border-left:0;border-top:1px solid #1E2E36}
  .corpo{grid-template-columns:minmax(0,1fr)}
  .uma img{width:min(100%,22rem)}
  .grade{max-width:30rem}
}
`;
