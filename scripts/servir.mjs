// Servidor estático de desenvolvimento com compressão (Brotli/gzip) e cache curto, parecido com o GitHub Pages.
// Uso: npm run servir [porta]  ->  http://localhost:5173/
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';

const raiz = process.cwd();
const porta = Number(process.argv[2] ?? 5173);
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon' };
const COMPRIMIVEIS = new Set(['.html', '.js', '.css', '.json', '.svg']);
const cache = new Map();

createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let caminho = normalize(join(raiz, decodeURIComponent(url.pathname)));
  if (!caminho.startsWith(raiz)) return res.writeHead(403).end();
  if (existsSync(caminho) && statSync(caminho).isDirectory()) caminho = join(caminho, 'index.html');
  if (!existsSync(caminho)) return res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Não encontrado');

  const ext = extname(caminho);
  const cabecalhos = { 'Content-Type': TIPOS[ext] ?? 'application/octet-stream', 'Cache-Control': 'public, max-age=600' };
  const aceita = String(req.headers['accept-encoding'] ?? '');
  const mtime = statSync(caminho).mtimeMs;
  let corpo = readFileSync(caminho);
  if (COMPRIMIVEIS.has(ext)) {
    const metodo = aceita.includes('br') ? 'br' : aceita.includes('gzip') ? 'gzip' : null;
    if (metodo) {
      const chave = `${caminho}|${mtime}|${metodo}`;
      if (!cache.has(chave)) cache.set(chave, metodo === 'br' ? brotliCompressSync(corpo) : gzipSync(corpo));
      corpo = cache.get(chave);
      cabecalhos['Content-Encoding'] = metodo;
    }
  }
  res.writeHead(200, { ...cabecalhos, 'Content-Length': corpo.length }).end(corpo);
}).listen(porta, () => console.log(`http://localhost:${porta}/`));
