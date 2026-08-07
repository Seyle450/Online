/**
 * OG-/Social-Vorschaubild für Antepli — 1200x630 (Standard für WhatsApp,
 * Instagram, Google, Twitter/X). Ersetzt das bisherige 3018x1918-PNG (4,4 MB).
 */
const path = require('path');
const fs = require('fs');
// puppeteer-core liegt in Marketing/node_modules — von dort auflösen,
// damit das Skript aus jedem Verzeichnis läuft.
const puppeteer = require(require.resolve('puppeteer-core', {
  paths: [path.resolve(__dirname, '../../../../Marketing')],
}));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const DIR = path.join(__dirname, '..');
const ASSETS = path.join(DIR, 'assets');
const FONTS = path.join(DIR, 'fonts');

const b64 = (p, mime) => 'data:' + mime + ';base64,' + fs.readFileSync(p).toString('base64');

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const p = await browser.newPage();
  await p.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });

  // Cormorant Garamond (Latin) + Manrope aus dem Projekt einbetten
  const serif = b64(path.join(FONTS, 'font-5.woff'), 'font/woff');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face{font-family:'CG';src:url('${serif}') format('woff');font-weight:500;font-style:normal;}
    *{margin:0;padding:0;box-sizing:border-box;}
    body{width:1200px;height:630px;position:relative;overflow:hidden;
      background:
        radial-gradient(900px 560px at 74% 48%, rgba(208,169,61,.16), transparent 68%),
        radial-gradient(700px 420px at 8% 0%, rgba(208,169,61,.08), transparent 70%),
        #18230f;
      font-family:'CG',Georgia,serif;color:#f4ecdd;}
    .grid{position:absolute;inset:0;opacity:.05;
      background-image:linear-gradient(rgba(244,236,221,.6) 1px,transparent 1px),
                       linear-gradient(90deg,rgba(244,236,221,.6) 1px,transparent 1px);
      background-size:64px 64px;transform:rotate(45deg) scale(1.6);}
    .frame{position:absolute;inset:26px;border:1px solid rgba(208,169,61,.34);}
    .frame::before{content:"";position:absolute;inset:9px;border:1px solid rgba(208,169,61,.14);}
    .left{position:absolute;left:84px;top:0;bottom:0;width:620px;
      display:flex;flex-direction:column;justify-content:center;}
    .eyebrow{display:flex;align-items:center;gap:14px;font-family:system-ui,sans-serif;
      font-size:15px;letter-spacing:.3em;text-transform:uppercase;color:#d0a93d;font-weight:700;margin-bottom:22px;}
    .eyebrow::before{content:"";width:44px;height:1px;background:#d0a93d;}
    h1{font-size:76px;line-height:1.02;font-weight:500;letter-spacing:-.01em;}
    h1 em{font-style:italic;color:#eccb52;}
    .sub{margin-top:26px;font-family:system-ui,sans-serif;font-size:21px;line-height:1.5;
      color:#d8cdb6;max-width:520px;font-weight:400;}
    .meta{margin-top:34px;display:flex;align-items:center;gap:16px;
      font-family:system-ui,sans-serif;font-size:16px;color:#d0a93d;font-weight:600;letter-spacing:.04em;}
    .dot{width:5px;height:5px;background:#d0a93d;transform:rotate(45deg);}
    .shot{position:absolute;right:-30px;top:50%;transform:translateY(-50%);width:560px;height:470px;object-fit:cover;
      border-radius:16px;box-shadow:0 30px 60px rgba(0,0,0,.55),0 0 0 1px rgba(208,169,61,.35);}
    .logo{position:absolute;right:64px;top:52px;height:74px;}
  </style></head><body>
    <div class="grid"></div>
    <div class="frame"></div>
    <img class="shot" src="${b64(path.join(ASSETS, 'hero-baklava.webp'), 'image/webp')}">
    <img class="logo" src="${b64(path.join(ASSETS, 'logo.png'), 'image/png')}">
    <div class="left">
      <span class="eyebrow">Türkische Patisserie · Bremen</span>
      <h1>Handgemachte<br><em>Baklava</em> &amp; Künefe</h1>
      <p class="sub">Frisch aus dem Ofen — nach original Gaziantep-Art. Jetzt online bestellen.</p>
      <div class="meta"><span>Waller Ring 121a</span><span class="dot"></span><span>28219 Bremen</span></div>
    </div>
  </body></html>`;

  await p.setContent(html, { waitUntil: 'load' });
  await p.evaluate(() => Promise.all([document.fonts.ready,
    ...[...document.images].map((i) => (i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; })))]));
  await new Promise((r) => setTimeout(r, 400));

  const png = path.join(ASSETS, 'og-image.png');
  await p.screenshot({ path: png });
  await p.close();

  // → WebP und JPG (JPG als breit unterstützter Fallback für Social-Crawler)
  const p2 = await browser.newPage();
  await p2.goto('data:text/html,<body>', { waitUntil: 'load' });
  const src = 'data:image/png;base64,' + fs.readFileSync(png).toString('base64');
  const out = await p2.evaluate(async (s) => {
    const img = new Image(); img.src = s; await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const x = c.getContext('2d');
    x.fillStyle = '#18230f'; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(img, 0, 0);
    return { webp: c.toDataURL('image/webp', 0.9), jpg: c.toDataURL('image/jpeg', 0.88) };
  }, src);
  await p2.close();

  fs.writeFileSync(path.join(ASSETS, 'og-image.webp'), Buffer.from(out.webp.split(',')[1], 'base64'));
  fs.writeFileSync(path.join(ASSETS, 'og-image.jpg'), Buffer.from(out.jpg.split(',')[1], 'base64'));
  fs.unlinkSync(png);
  for (const f of ['og-image.webp', 'og-image.jpg']) {
    console.log(f, (fs.statSync(path.join(ASSETS, f)).size / 1024).toFixed(0) + ' KB');
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
