// Minimal static file server for the test suite — serves the repo root
// (index.html + its card/art assets) so Playwright can load the real game
// over http:// instead of file:// (which some browser APIs the game uses,
// like fetch-free relative paths, behave inconsistently under).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.mp3': 'audio/mpeg',
};

export function startServer(){
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const filePath = path.join(repoRoot, urlPath === '/' ? '/index.html' : urlPath);
    if(!filePath.startsWith(repoRoot)){ res.writeHead(403); res.end(); return; }
    fs.readFile(filePath, (err, data) => {
      if(err){ res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise(resolve => {
    server.listen(0, () => resolve({ server, baseURL: `http://localhost:${server.address().port}` }));
  });
}
