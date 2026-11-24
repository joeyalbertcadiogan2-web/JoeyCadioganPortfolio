// Visual QA: screenshots at scroll positions. node tools/shoot.mjs [width] [height] [prefix] [reduced]
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const W = +process.argv[2] || 1440, H = +process.argv[3] || 900, prefix = process.argv[4] || 'desk', reduced = process.argv[5] === 'reduced';
const out = process.env.SHOTS || 'shots';
mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1, isMobile: W < 700, hasTouch: W < 700 });
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }]);
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('requestfailed', (r) => logs.push(`[reqfail] ${r.url()} ${r.failure()?.errorText}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 90000 });
await new Promise((r) => setTimeout(r, 1500));

const total = await page.evaluate(() => document.documentElement.scrollHeight);
const heroH = await page.evaluate(() => document.querySelector('.hero').offsetHeight - innerHeight);
const at = async (name, y, wait = 2600) => {
  await page.evaluate((y) => { const l = window.__site && window.__site.lenis; if (l) l.scrollTo(y, { immediate: true }); else window.scrollTo(0, y); }, y);
  await new Promise((r) => setTimeout(r, wait));
  await page.screenshot({ path: `${out}/${prefix}-${name}.png` });
};
const sec = (sel, f = 0.5) => page.evaluate((sel, f) => { const el = document.querySelector(sel); return el.getBoundingClientRect().top + scrollY + el.offsetHeight * f - innerHeight * 0.5; }, sel, f);

await at('00-hero', 0, 800);
for (const p of (process.env.PTS || '0.03,0.2,0.41,0.62,0.84').split(',').map(Number)) await at(`01-hero-${String(p).replace('.', '')}`, Math.round(heroH * p));
await at('02-about', await sec('#about', 0.42));
await at('03-services', await sec('#services', 0.3));
await at('04-process', await sec('#process', 0.5));
await at('05-work', await sec('#work', 0.35));
await at('06-cta', await sec('#contact', 0.5));
await at('07-footer', total);
console.log(`total ${total}px\n` + logs.filter((l) => !/GPU stall|swiftshader|WebGL-/i.test(l)).join('\n'));
await browser.close();
