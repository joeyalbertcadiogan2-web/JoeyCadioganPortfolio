// Captures About / Services / Case Studies with long settle times (for checking the 3D model).
import puppeteer from 'puppeteer-core';
const url = process.argv[2] || 'http://localhost:5173/', out = process.env.SHOTS || 'shots';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });
for (const [sel, f] of [['#about', 0.42], ['#services', 0.3], ['#work', 0.3]]) {
  const y = await p.evaluate((sel, f) => { const el = document.querySelector(sel); return el.getBoundingClientRect().top + scrollY + el.offsetHeight * f - innerHeight * 0.5; }, sel, f);
  await p.evaluate((y) => window.__site.lenis.scrollTo(y, { immediate: true }), y);
  await new Promise((r) => setTimeout(r, 10000));
  await p.screenshot({ path: `${out}/sec-${sel.slice(1)}.png` });
}
console.log(errs.length ? errs.join('\n') : 'no errors');
await b.close();
