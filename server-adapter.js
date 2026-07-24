import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import handler from './.output/server/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = path.join(__dirname, '.output', 'public');
const STATIC_EXTENSIONS = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2'];

createServer(async (req, res) => {
  const fullUrl = `http://${req.headers.host}${req.url}`;
  const url = new URL(fullUrl);
  const pathname = url.pathname;

  // 1. Statiska filer
  const ext = path.extname(pathname);
  if (STATIC_EXTENSIONS.includes(ext)) {
    const filePath = path.join(CLIENT_DIR, pathname);
    if (fs.existsSync(filePath)) {
      if (ext === '.png') res.setHeader('Content-Type', 'image/png');
      if (ext === '.js') res.setHeader('Content-Type', 'application/javascript');
      if (ext === '.css') res.setHeader('Content-Type', 'text/css');
      return fs.createReadStream(filePath).pipe(res);
    }
  }

  // 2. SSR via din handler med Cloudflare-kontext mockad
  try {
    const webRequest = new Request(fullUrl, {
      method: req.method,
      headers: new Headers(req.headers),
      body: req.method !== 'GET' ? req : null,
    });

    // Skicka med ett tomt/mockat Cloudflare-objekt (ersätter saknade ASSETS-bindningar)
    const env = process.env;
    const ctx = {
      waitUntil: (promise) => Promise.resolve(promise),
      passThroughOnException: () => {},
    };

    // TanStack Start / Nitro Cloudflare-modul tar emot (request, env, ctx)
    const response = await handler.fetch(webRequest, env, ctx);
    
    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value);
    }
    res.writeHead(response.status);
    const body = await response.text();
    res.end(body);
  } catch (err) {
    console.error("SSR Error:", err);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
}).listen(80);

console.log("Server running on http://0.0.0.0:80");