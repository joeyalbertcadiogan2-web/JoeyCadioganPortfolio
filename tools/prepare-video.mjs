// Prepares the Seedance hero orbit for smooth scroll-scrubbing and wires it into index.html.
// Usage: node tools/prepare-video.mjs path/to/seedance-output.mp4
// Output: assets/video/hero-1080.mp4 (desktop) and assets/video/hero-720.mp4 (mobile),
// encoded with every frame as a keyframe so seeking backward and forward is instant.
import ffmpeg from 'ffmpeg-static';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = process.argv[2];
if (!input) { console.error('Usage: node tools/prepare-video.mjs <seedance.mp4>'); process.exit(1); }
mkdirSync(path.join(root, 'assets/video'), { recursive: true });

const enc = (h, crf, out) => execFileSync(ffmpeg, ['-y', '-i', input, '-an', '-vf', `scale=-2:${h}:flags=lanczos`,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-g', '1', '-keyint_min', '1',
  '-movflags', '+faststart', path.join(root, 'assets/video', out)], { stdio: 'inherit' });
enc(1080, 25, 'hero-1080.mp4');
enc(720, 27, 'hero-720.mp4');

const html = path.join(root, 'index.html');
writeFileSync(html, readFileSync(html, 'utf8').replace('data-src="" data-src-mobile=""', 'data-src="assets/video/hero-1080.mp4" data-src-mobile="assets/video/hero-720.mp4"'));
console.log('Hero video ready and wired into index.html');
