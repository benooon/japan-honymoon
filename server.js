// Honeymoon dashboard — static server with HTTP Basic Auth.
//
// Required env var: SITE_PASSWORD   (set it in Railway → Variables)
// Optional env var: SITE_USER       (empty = any username accepted)
//
// The password is intentionally NOT hardcoded so this repo contains no secret.

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const USER = process.env.SITE_USER || '';
const PASS = process.env.SITE_PASSWORD || '';
const REALM = 'Ben & Ronit Honeymoon';
const FILE = path.join(__dirname, 'index.html');

const TYPES = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf', '.csv': 'text/csv; charset=utf-8'
};

// constant-time compare, avoids leaking the password via response timing
function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function authorized(req) {
  if (!PASS) return false; // fail closed if not configured
  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) return false;
  let decoded;
  try {
    decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  } catch {
    return false;
  }
  const i = decoded.indexOf(':');
  if (i < 0) return false;
  const userOk = USER === '' ? true : safeEqual(decoded.slice(0, i), USER);
  return userOk && safeEqual(decoded.slice(i + 1), PASS);
}

http.createServer((req, res) => {
  // Open health endpoint so Railway can probe the service.
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end(PASS ? 'ok' : 'ok (SITE_PASSWORD not set)');
  }

  if (!PASS) {
    res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end('<!doctype html><meta charset="utf-8">' +
      '<div style="font-family:sans-serif;text-align:center;margin-top:20vh">' +
      '<h2>⚙️ SITE_PASSWORD is not configured</h2>' +
      '<p>Set the <code>SITE_PASSWORD</code> variable in Railway and redeploy.</p></div>');
  }

  if (!authorized(req)) {
    res.writeHead(401, {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    return res.end('<!doctype html><meta charset="utf-8">' +
      '<div style="font-family:sans-serif;text-align:center;margin-top:22vh">' +
      '<h2>🔒 נדרשת סיסמה</h2><p>רעננו את הדף כדי לנסות שוב.</p></div>');
  }

  // Static assets (QR images, csv) — basename only, blocks path traversal.
  const reqPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const ext = path.extname(reqPath).toLowerCase();
  if (ext && TYPES[ext]) {
    const asset = path.join(__dirname, path.basename(reqPath));
    return fs.readFile(asset, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': TYPES[ext], 'Cache-Control': 'no-store' });
      res.end(data);
    });
  }

  fs.readFile(FILE, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Could not load dashboard.');
    }
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`Dashboard listening on ${PORT}` + (PASS ? ' (password protected)' : ' — SITE_PASSWORD NOT SET'));
});
