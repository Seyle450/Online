/**
 * Icon-Set für Antepli.
 *
 *   favicon.ico          16 / 32 / 48 px — das Icon neben dem Google-Treffer
 *                        und im Browser-Tab. Marken-„A" in Cormorant Garamond
 *                        auf dunkelgrün (der Logo-Schriftzug ist bei 16 px unlesbar).
 *   favicon-180.png      apple-touch-icon fürs iOS-Homescreen-Symbol
 *   favicon-192/512.png  Android / PWA — volles Logo, da genug Platz
 *   favicon.svg          Vektor-Variante fürs Tab (scharf auf allen Displays)
 *
 * Aufruf:  node tools/build-favicons.cjs
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

const GREEN = '#18230f';
const GOLD = '#d0a93d';

const b64 = (p, mime) => 'data:' + mime + ';base64,' + fs.readFileSync(p).toString('base64');

/** Kleines Format: Marken-„A" — bleibt bis 16 px lesbar. */
function letterHTML(size) {
  const serif = b64(path.join(FONTS, 'font-5.woff'), 'font/woff'); // Cormorant Garamond, Latin
  return `<!doctype html><meta charset="utf-8"><style>
    @font-face{font-family:'CG';src:url('${serif}') format('woff');font-weight:500;font-style:normal;}
    *{margin:0;padding:0}
    body{width:${size}px;height:${size}px;overflow:hidden;}
    .b{width:${size}px;height:${size}px;background:${GREEN};
       border-radius:${Math.round(size * 0.2)}px;
       display:flex;align-items:center;justify-content:center;}
    span{font-family:'CG',Georgia,serif;font-weight:500;color:${GOLD};
         font-size:${Math.round(size * 0.78)}px;line-height:1;
         transform:translateY(${size * 0.035}px);}
  </style><div class="b"><span>A</span></div>`;
}

/** Grosses Format: volles Logo auf dunkelgrün. */
function logoHTML(size, pad) {
  return `<!doctype html><meta charset="utf-8"><style>
    *{margin:0;padding:0}
    body{width:${size}px;height:${size}px;overflow:hidden;}
    .b{width:${size}px;height:${size}px;background:${GREEN};
       display:flex;align-items:center;justify-content:center;}
    img{width:${size - pad * 2}px;height:auto;}
  </style><div class="b"><img src="${b64(path.join(ASSETS, 'logo.png'), 'image/png')}"></div>`;
}

/** PNG-Buffer je Größe rendern. */
async function render(browser, html, size) {
  const p = await browser.newPage();
  await p.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await p.setContent(html, { waitUntil: 'load' });
  await p.evaluate(() => Promise.all([document.fonts.ready,
    ...[...document.images].map((i) => (i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; })))]));
  await new Promise((r) => setTimeout(r, 200));
  const buf = await p.screenshot({ type: 'png' });
  await p.close();
  return buf;
}

/**
 * ICO-Container aus PNG-Buffern bauen.
 * Ein ICO darf PNG-Daten direkt einbetten (von Windows Vista an, alle Browser).
 */
function buildIco(pngs) {
  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);     // reserviert
  header.writeUInt16LE(1, 2);     // Typ 1 = Icon
  header.writeUInt16LE(count, 4);

  const dir = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  pngs.forEach((p, i) => {
    const o = i * 16;
    dir.writeUInt8(p.size >= 256 ? 0 : p.size, o);     // Breite (0 = 256)
    dir.writeUInt8(p.size >= 256 ? 0 : p.size, o + 1); // Höhe
    dir.writeUInt8(0, o + 2);   // Farbpalette
    dir.writeUInt8(0, o + 3);   // reserviert
    dir.writeUInt16LE(1, o + 4);   // Farbebenen
    dir.writeUInt16LE(32, o + 6);  // Bit pro Pixel
    dir.writeUInt32LE(p.buf.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += p.buf.length;
  });

  return Buffer.concat([header, dir, ...pngs.map((p) => p.buf)]);
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });

  // favicon.ico — 16/32/48
  const icoParts = [];
  for (const size of [16, 32, 48]) {
    icoParts.push({ size, buf: await render(browser, letterHTML(size), size) });
  }
  const ico = buildIco(icoParts);
  fs.writeFileSync(path.join(DIR, 'favicon.ico'), ico);
  console.log('favicon.ico          16/32/48  ' + (ico.length / 1024).toFixed(1) + ' KB');

  // PNG-Varianten
  const pngs = [
    ['favicon-32.png', letterHTML(32), 32],
    ['favicon-180.png', logoHTML(180, 22), 180],   // apple-touch-icon
    ['favicon-192.png', logoHTML(192, 24), 192],   // Android
    ['favicon-512.png', logoHTML(512, 64), 512],   // PWA / Splash
  ];
  for (const [name, html, size] of pngs) {
    const buf = await render(browser, html, size);
    fs.writeFileSync(path.join(ASSETS, name), buf);
    console.log(name.padEnd(20) + ' ' + size + 'x' + size + '  ' + (buf.length / 1024).toFixed(1) + ' KB');
  }

  await browser.close();

  // SVG-Variante fürs Tab — gleiche Bildsprache wie das ICO, aber vektoriell.
  // Schrift bewusst als Pfad-freie Textangabe mit Serif-Fallback: das SVG wird
  // nur im Tab genutzt, wo eine Systemserife völlig ausreicht.
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">'
    + '<rect width="128" height="128" rx="26" fill="' + GREEN + '"/>'
    + '<text x="64" y="68" font-family="Cormorant Garamond, Georgia, serif" font-weight="500"'
    + ' font-size="100" fill="' + GOLD + '" text-anchor="middle" dominant-baseline="central">A</text>'
    + '</svg>\n';
  fs.writeFileSync(path.join(ASSETS, 'favicon.svg'), svg);
  console.log('favicon.svg          Vektor    ' + (svg.length / 1024).toFixed(1) + ' KB');

  // Web-App-Manifest
  const manifest = {
    name: 'ANTEPLI — Baklava & Künefe',
    short_name: 'ANTEPLI',
    description: 'Türkische Patisserie in Bremen — Baklava, Künefe und ganze Bleche online bestellen.',
    start_url: '/',
    display: 'standalone',
    background_color: GREEN,
    theme_color: GREEN,
    icons: [
      { src: 'assets/favicon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'assets/favicon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'assets/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  };
  fs.writeFileSync(path.join(DIR, 'site.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('site.webmanifest     erzeugt');
})().catch((e) => { console.error(e); process.exit(1); });
