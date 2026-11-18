# Rick and Morty API · Desafio de mercado (CT-EXT-02)

Automação de testes de **API pública** feita com Playwright + TypeScript, para cumprir o item da atividade:

> "Desafio extra: 1 CT E2E + 1 CT de API em site/API pública à escolha."

**Resultado (15/11/2026):** 8 casos de teste, 7 passam e 1 falha **como esperado**, documentando um defeito que encontramos na própria API pública. Tempo total: menos de 1 segundo só de API; cerca de 7 segundos com a **vitrine** ligada (a tela que mostra as respostas).

- **API:** https://rickandmortyapi.com/api (gratuita, sem cadastro, sem token)
- **Card no Jira:** SCRUM-24 (CT-EXT-02), dono: Anthony Ricardo
- **Rodar:** `npm run test:rm` · ver na interface: `npm run test:rm:ui` · janela ao vivo: `npm run test:rm:vitrine`

---

## 1. Por que esta API

| Critério | Por que a Rick and Morty API atende |
| --- | --- |
| Pública e estável | Não pede chave nem login; responde em menos de 300 ms |
| Respostas ricas | Personagens, episódios e locais, com relações entre eles (dá para **encadear** chamadas) |
| Erros bem definidos | 404 com mensagem clara: dá para testar **cenários negativos** (o professor pediu erros tratados) |
| Paginação e filtros | Permite testar parâmetros de busca (`?name=`, `?status=`, `?page=`) |

---

## 2. Estrutura da pasta

A pasta repete, em miniatura, a mesma arquitetura do projeto da Loja QA. Cada arquivo tem uma responsabilidade só.

```
rick-and-morty/
├── api/RickAndMortyApi.ts           ← API Object: COMO chamar cada endpoint (sem expect)
├── fixtures/rick-and-morty.fixture.ts ← entrega o API Object e a vitrine prontos ao teste
├── data/rick-and-morty.data.ts      ← massa de dados: ids, filtros, nomes, mensagens esperadas
├── vitrine/Vitrine.ts               ← MOSTRA cada resposta numa tela: fotos, status e JSON (sem expect)
├── tests/rick-and-morty.spec.ts     ← O QUE testar e o que esperar (CT-EXT-02.1 a 02.8)
└── README.md                        ← este documento
```

| Peça | Na Loja QA | Aqui |
| --- | --- | --- |
| Quem sabe **como** interagir | `pages/CheckoutPage.ts` (Page Object) | `api/RickAndMortyApi.ts` (API Object) |
| Quem **prepara** o teste | `fixtures/auth.fixture.ts` (sessão logada) | `fixtures/rick-and-morty.fixture.ts` (cliente da API) |
| **Com quais dados** | `data/checkout.data.ts` | `data/rick-and-morty.data.ts` |
| **O que** verificar | `tests/e2e/lojaqa-modulo-6.spec.ts` | `tests/rick-and-morty.spec.ts` |
| O que a banca **vê** | a própria loja no navegador | `vitrine/Vitrine.ts` (uma tela montada com as respostas) |

### Como as peças conversam

```
npm run test:rm
   └─> playwright.config.ts  (project "rick-and-morty": baseURL da API, sem setup de login)
         └─> rick-and-morty.spec.ts   pede { rickApi, vitrine }
               ├─> rick-and-morty.fixture.ts   cria new RickAndMortyApi(request)
               │     └─> RickAndMortyApi.ts    request.get('character/1')
               │           └─> https://rickandmortyapi.com/api/character/1
               └─> vitrine.mostrar(...)        imprime no console e desenha o card na tela
```

---

## 3. Os arquivos explicados

### 3.1 `api/RickAndMortyApi.ts`: o API Object

É o "controle remoto" da API. Ele sabe o **caminho** de cada endpoint e devolve a resposta crua; **não verifica nada** (nenhum `expect`). Se a API mudar um caminho, conserta-se só aqui.

```ts
export class RickAndMortyApi {
  constructor(private readonly request: APIRequestContext) {}

  personagem(id: number | string) { return this.request.get(`character/${id}`); }
  variosPersonagens(ids: number[]) { return this.request.get(`character/${ids.join(',')}`); }
  buscarPersonagens(filtros: Filtros) { /* remove filtros vazios */ return this.request.get('character/', { params }); }
  seguir(url: string) { return this.request.get(url); }
}
```

- `request` é a fixture do Playwright que faz chamadas HTTP **sem abrir navegador**.
- Os caminhos não começam com `/` porque a `baseURL` (`https://rickandmortyapi.com/api/`) já termina com barra. Com `'/character/1'` o Playwright descartaria o `/api`.
- Os **tipos** (`Personagem`, `Episodio`, `Pagina<T>`, `ErroApi`) descrevem o contrato da API: o TypeScript avisa se o teste usar um campo que não existe.

### 3.2 `fixtures/rick-and-morty.fixture.ts`: a preparação

```ts
export const test = base.extend<{ rickApi: RickAndMortyApi }, { vitrine: Vitrine }>({
  rickApi: async ({ request }, use) => {
    await use(new RickAndMortyApi(request));
  },
  vitrine: [
    async ({ browser, headless }, use) => {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await use(await Vitrine.abrir(page));
      if (!headless) await page.waitForEvent('close', { timeout: 0 }); // janela aberta: espera você fechar
      if (!page.isClosed()) await page.close();
    },
    { scope: 'worker', timeout: 0 },
  ],
});
```

Uma **fixture** é uma preparação reutilizável: tudo antes do `use()` arruma o terreno, o `use()` é o teste rodando. O teste pede `{ rickApi, vitrine }` e já recebe tudo pronto. Diferente da Loja QA, **não há login**: a API é pública.

- `rickApi` é criada de novo para cada teste.
- `vitrine` tem `scope: 'worker'`: **uma** página serve os 8 testes, por isso as chamadas vão se acumulando na tela, uma a uma.
- Com a janela aberta (`--headed`), depois do último teste a fixture espera você **fechar a janela** (`timeout: 0` tira o limite de tempo). Enquanto isso, o terminal mostra "Vitrine aberta" e fica aguardando.
- Com `VITRINE=0` no `.env`, a fixture entrega uma vitrine desligada (só console) e nenhum navegador é aberto.

### 3.3 `data/rick-and-morty.data.ts`: a massa de dados

Guarda os valores esperados (`RICK`, `FAMILIA_SMITH`, `PILOTO`, `MENSAGENS`...). O teste nunca escreve "Rick Sanchez" solto no meio do código: se a API mudar, muda-se um lugar só.

### 3.4 `tests/rick-and-morty.spec.ts`: os casos de teste

Cada teste segue o mesmo roteiro: **chamar → mostrar → verificar**. O `vitrine.mostrar()` imprime no console o endereço chamado, o `STATUS`, o `CONTENT-TYPE` e o JSON, e desenha o card na tela. Quem decide se o teste passou continua sendo o `expect`, direto na resposta da API.

```ts
const res = await rickApi.personagem(RICK.id);
await vitrine.mostrar('CT-EXT-02.1 · personagem 1', res, { esperado: 200, resumo: {...} });
expect(res.status()).toBe(200);
```

### 3.5 `vitrine/Vitrine.ts`: a tela das respostas

Teste de API não abre navegador, então a área de tela do UI Mode ficava preta. A vitrine é uma página **só de exibição**: a cada chamada, monta um card com:

- o **status** com o significado da faixa: 2xx sucesso, 4xx erro de quem chamou, 5xx erro do servidor;
- **✓ ou ✗** comparando com o `esperado` que o teste informou (no 02.8: "✗ esperado 400, veio 500");
- as **fotos** que a resposta traz: personagem (`image`), página (`results[].image`), lista de ids e até episódio (os links de `characters` viram a foto de cada personagem);
- o **JSON** da resposta (ou o `resumo`, quando ela é grande demais);
- à direita, o **histórico** de todas as chamadas da execução, com status e ✓/✗. Clique numa chamada para ver os detalhes dela.

A tela é **responsiva**. O texto acompanha a largura da tela, com tamanho mínimo e máximo, e as fotos ocupam uma fração da tela: crescem em monitor grande e encolhem em notebook. Abaixo de 900 px de largura, o histórico desce para baixo dos detalhes. Com a janela aberta (`npm run test:rm:vitrine`), ela já abre **maximizada** e acompanha qualquer redimensionamento.

Como o API Object, ela **não tem `expect`**. Duas proteções evitam que ela atrapalhe os testes:

| Proteção | Por quê |
| --- | --- |
| No máximo 6 fotos por card (o resto aparece como "+ 14 nesta resposta") | As fotos vêm do **mesmo servidor** da API. Com ~60 fotos de uma vez, a API respondeu **429 Too Many Requests** e derrubou os testes seguintes |
| Cache das fotos em disco (`%TEMP%\vitrine-rick-and-morty`) | Cada foto é baixada **uma vez só**. Da segunda execução em diante, a vitrine não faz nenhuma requisição de foto |

---

## 4. Os 8 casos de teste

| ID | O que faz | O que prova | Resultado |
| --- | --- | --- | --- |
| CT-EXT-02.1 | `GET /character/1` | Status 200, JSON, dados do Rick e o **contrato** (cada campo com o tipo certo) | Passou |
| CT-EXT-02.2 | `GET /character/?name=rick&status=alive` | Os **dois filtros** valem para todos os resultados | Passou |
| CT-EXT-02.3 | `GET /character/?page=2` | **Paginação**: 20 por página, ids 21 a 40, links `prev`/`next` | Passou |
| CT-EXT-02.4 | Personagem → link do 1º episódio | **Encadeamento**: segue um link que a própria API devolveu; o 1º episódio é o "Pilot" | Passou |
| CT-EXT-02.5 | `GET /character/1,2,3` | Vários ids numa chamada devolvem a família Smith, em ordem | Passou |
| CT-EXT-02.6 | `GET /character/999999` | **Negativo**: 404 "Character not found" | Passou |
| CT-EXT-02.7 | `GET /character/?name=zzzzzz` | **Negativo**: busca sem resultado dá 404 "There is nothing here" | Passou |
| CT-EXT-02.8 | `GET /character/abc` | **Achado**: id inválido deveria dar 400; a API dá **500** | Falha esperada (`test.fail`) |

### Técnicas usadas (boas para explicar na banca)

| Técnica | Onde | Para que serve |
| --- | --- | --- |
| `toMatchObject` | 02.1, 02.4 | Confere só os campos que importam, ignorando o resto |
| `expect.objectContaining` + `expect.any(Number)` | 02.1 | Valida o **contrato** (tipo de cada campo), não só o valor |
| `expect.soft` dentro de um laço | 02.2 | Confere **todos** os resultados e lista todos os que falharem, sem parar no primeiro |
| Encadeamento de chamadas | 02.4 | Usa a saída de uma chamada como entrada da próxima, como um cliente real faz |
| `test.fail` | 02.8 | Documenta um defeito conhecido como teste: "falha como esperado"; se corrigirem, o Playwright avisa |

---

## 5. O achado: id inválido devolve 500

```
GET https://rickandmortyapi.com/api/character/abc
STATUS: 500 Internal Server Error
{ "error": "Hey! you must provide an id" }
```

A mensagem está certa, mas o **código** está errado. Códigos 4xx dizem "o erro é de quem chamou" e 5xx dizem "o servidor quebrou". Mandar `abc` como id é erro de quem chama, então o correto seria **400 Bad Request**. Um 500 dispara alarmes de servidor fora do ar à toa e esconde do cliente que ele precisa corrigir a chamada.

O CT-EXT-02.8 documenta isso com `test.fail`: hoje ele aparece como "falha esperada" e a suíte continua verde.

---

## 6. Como rodar

| Comando | O que faz | Quando usar |
| --- | --- | --- |
| `npm run test:rm` | Roda os 8 casos e imprime cada chamada no terminal | Conferir rápido |
| `npm run test:rm:ui` | Abre o **UI Mode**: clique num teste e a tela mostra a vitrine daquele momento (fotos, status, JSON); as abas *Network* e *Console* mostram cada requisição | **Melhor para apresentar e explicar** |
| `npm run test:rm:vitrine` | Abre uma janela e os cards vão aparecendo um a um. No fim, a janela **fica parada** até você fechar: clique nas chamadas à direita para analisar cada uma | Demonstração ao vivo "assistindo" a API responder (com `SLOWMO=400` fica no ritmo da banca) e análise com calma depois |
| `npx playwright test --project=rick-and-morty -g "02.4"` | Roda um caso só (pelo nome) | Mostrar um caso específico |
| `npm run report` | Abre o relatório HTML da última execução | Mostrar o resultado e as anotações |

**Debug de teste de API:** o `--debug` do Playwright pausa ações de **navegador**; as chamadas de API passam direto. Para acompanhar passo a passo, use o **UI Mode**: na lista de ações, cada `Vitrine · CT-EXT-02.x → status` é um passo, e clicar nele mostra a tela daquele momento. Para parar numa linha do código, use um *breakpoint* no VS Code com a extensão Playwright Test (botão direito no ▶ do teste → *Debug Test*).

### O que aparece no console

```
▶ CT-EXT-02.6 · personagem 999999
  GET https://rickandmortyapi.com/api/character/999999
  STATUS: 404 Not Found · CONTENT-TYPE: application/json; charset=utf-8
{
  "error": "Character not found"
}
```

A saída completa da última execução está em [`docs/evidencias/CT-EXT-02-console.txt`](../docs/evidencias/CT-EXT-02-console.txt).

---

## 7. Configuração no projeto

No `playwright.config.ts`, a pasta tem um *project* próprio:

```ts
{
  name: 'rick-and-morty',
  testDir: './rick-and-morty/tests',      // pasta própria, fora de ./tests
  testMatch: /.*\.spec\.ts$/,
  use: { baseURL: process.env.RICK_MORTY_URL ?? 'https://rickandmortyapi.com/api/' },
}
```

Ele **não tem** `dependencies: ['setup']`: a API é pública, então não precisa do login da Loja QA e roda sozinho, mesmo se a API da Loja estiver fora do ar.

---

## 8. Na banca (cerca de 1 minuto)

1. "Escolhemos a Rick and Morty API: pública, sem token, com erros bem definidos."
2. Rodar `npm run test:rm:vitrine`: a janela abre e os cards aparecem um a um. No fim, no histórico à direita, clicar no **CT-EXT-02.4**: "a primeira chamada traz o personagem; a segunda segue o link do primeiro episódio que a própria API devolveu." A vitrine mostra o Pilot e os personagens dele.
3. Clicar no **CT-EXT-02.6**: "cenário negativo: id que não existe dá 404 com mensagem." A vitrine mostra o 404 com ✓ esperado.
4. Fechar no **CT-EXT-02.8**: "e achamos um defeito na API pública: id inválido devolve 500 em vez de 400. Documentamos com `test.fail`." A vitrine mostra "✗ esperado 400, veio 500". Depois, fechar a janela para encerrar a execução.

Plano B: `npm run test:rm:ui` mostra a mesma vitrine dentro do UI Mode (clique em ▶ e depois em cada teste).

### Perguntas prováveis

| Pergunta | Resposta curta |
| --- | --- |
| Por que um API Object? | Mesma ideia do Page Object: o teste diz **o que** verificar, o API Object sabe **como** chamar. Mudou um caminho, conserta-se em um lugar. |
| Por que este project não depende do setup? | A API é pública: não há login. Assim ele roda sozinho e rápido. |
| O que o 02.1 valida além dos dados? | O contrato: cada campo existe e tem o tipo certo (`expect.any(Number)`). |
| Por que `expect.soft` no 02.2? | Para conferir todos os resultados e listar todos os que falharem, em vez de parar no primeiro. |
| Por que 500 é um defeito se a mensagem está certa? | O código diz quem errou. 5xx culpa o servidor; aqui o erro é de quem chamou, então o certo é 400. |
| Se é teste de API, por que abre navegador? | O navegador é só a **vitrine**, para quem assiste ver o que voltou. Toda validação é feita na resposta da API, com `request`. Com `VITRINE=0` os testes rodam sem navegador nenhum. |

## 9. Problemas comuns

| Sintoma | Causa provável | Solução |
| --- | --- | --- |
| `getaddrinfo ENOTFOUND rickandmortyapi.com` | Sem internet | Use a internet reserva (roteador do celular) |
| 404 em todos os testes | Caminho com `/` no começo | Use `character/1`, sem barra inicial |
| 429 Too Many Requests | Muitas execuções seguidas (ou cache das fotos apagado na mesma hora) | Espere alguns segundos e rode de novo |
| Vitrine sem fotos | Sem internet na primeira execução (o cache ainda estava vazio) | Rode uma vez com internet; depois as fotos saem do cache |
