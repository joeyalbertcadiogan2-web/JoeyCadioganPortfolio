// Turns the raw Higgsfield outputs in assets/src into optimized web assets in assets/img.
// Run: node tools/process-assets.mjs   (from the Portfolio folder or tools folder)
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => path.join(root, 'assets/src', f);
const out = (f) => path.join(root, 'assets/img', f);
mkdirSync(path.join(root, 'assets/img'), { recursive: true });

// 1. Hero first frame + matching foreground cutout, center-cropped to exact 16:9 at identical
//    sizes so they stay pixel-aligned. hero-start-16x9.png is the Seedance start frame.
const crop = { left: Math.round((2752 - 2731) / 2), top: 0, width: 2731, height: 1536 };
await sharp(src('hero-frame.png')).extract(crop).png().toFile(src('hero-start-16x9.png'));
const cutFull = await sharp(src('hero-cutout.png')).resize(2752, 1536).extract(crop).png().toBuffer();
for (const w of [2400, 1280]) {
  const h = Math.round(w * 9 / 16);
  await sharp(src('hero-start-16x9.png')).resize(w, h).webp({ quality: w > 2000 ? 84 : 80 }).toFile(out(`hero-frame-${w}.webp`));
  await sharp(cutFull).resize(w, h).webp({ quality: 84, alphaQuality: 90 }).toFile(out(`hero-cutout-${w}.webp`));
}

// 2. Signature automation-core image (used as the no-WebGL / reduced-motion fallback).
await sharp(src('core.png')).resize(900, 900).webp({ quality: 82 }).toFile(out('core.webp'));

// 3. Concept objects: model the dark gradient background, key it out, and keep true alpha.
const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

async function keyObject(name, size = 900) {
  const { data, info } = await sharp(src(`${name}.png`)).resize(size, size).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const px = (x, y) => (y * W + x) * 3;

  // Background per row = average of the outer 6% columns (handles vertical gradients / floor glow).
  const band = Math.round(W * 0.06), bg = new Float32Array(H * 3);
  for (let y = 0; y < H; y++) {
    let r = 0, g = 0, b = 0, n = 0;
    for (const x0 of [0, W - band]) for (let x = x0; x < x0 + band; x++) { const i = px(x, y); r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
    bg[y * 3] = r / n; bg[y * 3 + 1] = g / n; bg[y * 3 + 2] = b / n;
  }

  const outBuf = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = px(x, y), o = (y * W + x) * 4;
    const br = bg[y * 3], bgc = bg[y * 3 + 1], bb = bg[y * 3 + 2];
    const dr = data[i] - br, dg = data[i + 1] - bgc, db = data[i + 2] - bb;
    const d = Math.max(Math.abs(dr), Math.abs(dg), Math.abs(db), Math.hypot(dr, dg, db) * 0.7);
    // Soft radial vignette removes stray floor reflections near the frame edges.
    const rx = (x / W - 0.5) * 2, ry = (y / H - 0.5) * 2, rr = Math.hypot(rx, ry);
    let a = smooth(6, 42, d) * (1 - smooth(0.82, 1.0, rr));
    if (a < 0.02) a = 0;
    // Un-mix the background so semi-transparent glass and glow edges don't carry a grey halo.
    const un = (c, b0) => a > 0 ? Math.min(255, Math.max(0, b0 * 0 + (c - b0 * (1 - a)) / a)) : 0;
    outBuf[o] = un(data[i], br); outBuf[o + 1] = un(data[i + 1], bgc); outBuf[o + 2] = un(data[i + 2], bb);
    outBuf[o + 3] = Math.round(a * 255);
  }
  await sharp(outBuf, { raw: { width: W, height: H, channels: 4 } })
    .trim({ threshold: 1 }).extend({ top: 24, bottom: 24, left: 24, right: 24, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 84, alphaQuality: 92 }).toFile(out(`${name}.webp`));
}
for (const n of ['obj-nodes', 'obj-orb', 'obj-pipeline', 'obj-tiles']) await keyObject(n);

console.log('assets processed');
