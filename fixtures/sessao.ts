// fixtures/sessao.ts — um único lugar para o caminho do arquivo do token.
// Setup, fixture e testes de API importam daqui. Assim ninguém escreve o
// caminho "na mão" em vários arquivos (e ninguém importa um arquivo de teste
// dentro de outro, o que faria o Playwright registrar testes duplicados).
export const SESSAO = '.auth/sessao.json';
