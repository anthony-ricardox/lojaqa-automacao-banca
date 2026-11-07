# Banca 06 · Checkout & Pagamentos (Loja QA · FAP 2026)

- Playwright + TypeScript. Page Objects em `pages/` NUNCA têm `expect` (o Page Object age, o spec verifica).
- Seletores: `getByRole`, `getByLabel`, `getByTestId`. Proibido `waitForTimeout` (use `waitForResponse` ou `expect`).
- No projeto e2e, `testIdAttribute: 'id'`: `getByTestId('cardNumber')` encontra `#cardNumber`.
- API: `baseURL` termina em `/api/` → paths sem barra inicial (`'orders'`, não `'/orders'`).
- Login só como setup (`tests/setup/auth.setup.ts`), por causa do rate limit: 5 tentativas / 15 min por IP. O token fica em `.auth/sessao.json` por 1 hora.
- Specs E2E importam `{ test, expect }` de `fixtures/auth.fixture.ts`, não de `@playwright/test`.
- IDs dos testes = IDs do Jira/Zephyr (CT-E2E-xx, CT-API-xx, CT-EXT-xx).
- Time: Anthony (base + E2E), André (API, dados, README), Rodrigo (externos, Jira/Zephyr, slides).
- `.env` e `.auth/` nunca vão para o Git.
