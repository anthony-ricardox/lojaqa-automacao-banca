// presentation/slides/gerar-pdf.mjs — transforma os slides HTML em PDF usando o Chromium do Playwright.
// Rodar: npm run slides
// Gera: presentation/apresentacao-slides.pdf (7 slides da banca) e presentation/anexos-banca.pdf (4 anexos).
// Opcional: PREVIEW_DIR=<pasta> salva um PNG de cada slide, para conferir o visual.
import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const html = pathToFileURL(path.join(aqui, 'apresentacao.html')).href;
const saida = path.join(aqui, '..');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready); // espera as fontes do Google carregarem
await page.waitForFunction(() => window.__pronto === true); // espera o QR code

const pdf = { width: '1920px', height: '1080px', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } };
await page.pdf({ ...pdf, path: path.join(saida, 'apresentacao-slides.pdf'), pageRanges: '1-7' });
await page.pdf({ ...pdf, path: path.join(saida, 'anexos-banca.pdf'), pageRanges: '8-11' });
console.log('PDFs gerados em presentation/');

if (process.env.PREVIEW_DIR) {
  fs.mkdirSync(process.env.PREVIEW_DIR, { recursive: true });
  const slides = page.locator('section.slide');
  const total = await slides.count();
  for (let i = 0; i < total; i++) {
    await slides.nth(i).screenshot({ path: path.join(process.env.PREVIEW_DIR, `slide-${String(i + 1).padStart(2, '0')}.png`) });
  }
  console.log(`${total} prévias PNG em ${process.env.PREVIEW_DIR}`);
}

await browser.close();
