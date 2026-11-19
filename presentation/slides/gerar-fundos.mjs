// presentation/slides/gerar-fundos.mjs — "assa" os fundos com degradê transparente em imagens opacas (JPEG).
// Rodar (só quando mudar uma imagem de origem ou um degradê daqui): node presentation/slides/gerar-fundos.mjs
//
// Por quê: o Chrome grava todo degradê com transparência no PDF como um sombreado do tipo 1 (com função
// PostScript). Leitores baseados no pdf.js (Firefox, Moodle, extensões do VS Code) não desenham esse tipo
// e pintam a área de ROSA. Misturando aqui, num print, o PDF recebe só uma imagem comum: aparece igual em qualquer leitor.
//
// Gera em img/:
//   fundo-loja.jpg     slide 5, esquerda: vitrine da Loja QA escurecendo para o fundo
//   fundo-mercado.jpg  slide 5, direita: SauceDemo + personagens do Rick and Morty escurecendo para o fundo
//   cartao.jpg         slide 1: o fundo do cartão de crédito (brilho verde no canto)
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const img = path.join(path.dirname(fileURLToPath(import.meta.url)), 'img');
const dataUri = (arquivo) => {
  const tipo = arquivo.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return `data:${tipo};base64,${fs.readFileSync(path.join(img, arquivo)).toString('base64')}`;
};

// Véu do slide 5: o topo fica limpo e escurece até o fundo do slide (#091217) em 454 px (42% de 1080).
const VEU = 'linear-gradient(180deg, rgba(9,18,23,0) 0px, rgba(9,18,23,.04) 216px, rgba(9,18,23,.80) 302px, rgba(9,18,23,.95) 378px, #091217 454px)';
const personagens = Array.from({ length: 9 }, (_, i) => `<img src="${dataUri(`rick-and-morty/${i + 1}.jpeg`)}">`).join('');

const fundos = {
  'fundo-loja.jpg': {
    largura: 960, altura: 460,
    html: `<div style="position:absolute;inset:0;background:url(${dataUri('loja-vitrine.png')}) 0 0/960px auto no-repeat,#F3F1EC"></div>`,
    veu: VEU,
  },
  'fundo-mercado.jpg': {
    largura: 960, altura: 460,
    html: `<div style="position:absolute;inset:0;display:grid;grid-template-columns:480px 480px">
             <div style="background:url(${dataUri('saucedemo.png')}) 0 0/480px auto no-repeat,#fff;border-right:2px solid #2C4450"></div>
             <div style="display:grid;grid-template-columns:repeat(3,160px);grid-auto-rows:160px;background:#0B1A12">${personagens}</div>
           </div>`,
    veu: VEU,
  },
  'cartao.jpg': {
    largura: 600, altura: 378,
    html: '',
    veu: 'radial-gradient(130% 150% at 100% 0%, #2C8F87 0%, transparent 55%), linear-gradient(135deg, #0E1B24, #16424A)',
  },
};

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
for (const [arquivo, f] of Object.entries(fundos)) {
  await page.setContent(
    `<style>*{margin:0}img{width:160px;height:160px;object-fit:cover;display:block}</style>
     <div id="alvo" style="position:relative;overflow:hidden;width:${f.largura}px;height:${f.altura}px;background:#091217">
       ${f.html}<div style="position:absolute;inset:0;background:${f.veu}"></div>
     </div>`,
    { waitUntil: 'load' },
  );
  await page.locator('#alvo').screenshot({ path: path.join(img, arquivo), type: 'jpeg', quality: 90 });
  console.log(`img/${arquivo}`);
}
await browser.close();
