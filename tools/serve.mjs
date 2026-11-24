// Tiny static server for local preview (ES modules don't load over file://).
// Run: node tools/serve.mjs   then open http://localhost:5173
import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = +process.env.PORT || 5173;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm', '.glb': 'model/gltf-binary' };

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(root, url === '/' ? 'index.html' : url);
  if (!file.startsWith(root) || /[\\/](tools|assets[\\/]src)[\\/]/.test(file.slice(root.length))) { res.writeHead(403).end(); return; }
  let st; try { st = statSync(file); } catch { res.writeHead(404).end('Not found'); return; }
  const type = types[path.extname(file).toLowerCase()] || 'application/octet-stream';
  // Range support so <video> can seek while scrubbing.
  const range = req.headers.range;
  if (range) {
    const [a, b] = range.replace('bytes=', '').split('-'), start = +a, end = b ? +b : st.size - 1;
    res.writeHead(206, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
    createReadStream(file, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes' });
    createReadStream(file).pipe(res);
  }
}).listen(port, () => console.log(`Portfolio running at http://localhost:${port}`));
