/**
 * Favicons für ALLE Sites im Portfolio.
 *
 * Pro Site wird die vorhandene Icon-Quelle genommen (assets/favicon.svg,
 * favicon.png oder die inline data:-URL im HTML) und daraus erzeugt:
 *   favicon.ico            16/32/48 px, im Site-Root  → das Icon im Google-Treffer
 *   assets/favicon-180.png apple-touch-icon fürs iOS-Homescreen-Symbol
 * Danach werden die <link>-Verweise in allen HTML-Seiten der Site vereinheitlicht.
 *
 * Das Aussehen der bestehenden Icons wird NICHT verändert — nur in Formate
 * gebracht, die Browser und Suchmaschinen zuverlässig lesen.
 *
 * Aufruf:  node tools/build-favicons-alle.cjs [--dry]
 */
const path = require('path');
const fs = require('fs');
const puppeteer = require(require.resolve('puppeteer-core', {
  paths: [path.resolve(__dirname, '../../Marketing')],
}));

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = path.resolve(__dirname, '..');
const DRY = process.argv.includes('--dry');

const SITES = [
  '.', 'analytics', 'privat',
  'privat/bay', 'privat/cafe-petit', 'privat/coffee-corner', 'privat/dilans',
  'privat/farfalla', 'privat/grundschule-am-halmerweg', 'privat/habitat',
  'privat/hochzeit', 'privat/kleiner-olymp', 'privat/pizza blitz', 'privat/traumclean',
  'Webdesign-Agentur/Starscape', 'Webdesign-Agentur/bens', 'Webdesign-Agentur/cafe-niki',
  'Webdesign-Agentur/hevis', 'Webdesign-Agentur/lokma-lovers',
];
// antepli-baklava hat sein Set bereits (eigenes tools/build-favicons.cjs)

const htmlsOf = (dir) => fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.html'));

/**
 * Liefert das href des aussagekräftigsten <link rel="icon"> einer HTML-Datei.
 *
 * Bewusst von Hand geparst statt per <link[^>]*>-Muster: manche data:-URLs sind
 * UNKODIERT und enthalten selbst < und > (hochzeit), andere enthalten einfache
 * Anführungszeichen (xmlns='…'). Beides zerlegt jedes naive Muster — und ein
 * halb gelesenes SVG rendert am Ende als schwarzer Kasten.
 *
 * favicon.ico wird übersprungen: sonst nimmt ein zweiter Lauf sein eigenes
 * Ergebnis als Quelle und die Qualität baut Schritt für Schritt ab.
 */
function iconHref(src) {
  const kandidaten = [];
  const re = /<link\b/gi;
  let m;
  while ((m = re.exec(src))) {
    // Tag-Ende suchen, dabei Anführungszeichen respektieren
    let i = m.index + 5, quote = null, ende = -1;
    for (; i < src.length && i < m.index + 6000; i++) {
      const c = src[i];
      if (quote) { if (c === quote) quote = null; continue; }
      if (c === '"' || c === "'") { quote = c; continue; }
      if (c === '>') { ende = i; break; }
    }
    if (ende < 0) continue;
    const tag = src.slice(m.index, ende + 1);
    if (!/rel\s*=\s*["'][^"']*icon[^"']*["']/i.test(tag)) continue;
    if (/apple/i.test(tag)) continue;

    const hm = tag.match(/href\s*=\s*"([^"]*)"/i) || tag.match(/href\s*=\s*'([^']*)'/i);
    if (!hm) continue;
    const href = hm[1];
    if (/favicon\.ico/i.test(href)) continue;   // nicht das eigene Ergebnis lesen
    kandidaten.push(href);
  }
  // data: und .svg sind besser als .png
  return kandidaten.find((h) => h.startsWith('data:'))
      || kandidaten.find((h) => /\.svg(\?|$)/i.test(h))
      || kandidaten[0]
      || null;
}

/**
 * Icon-Quelle einer Site finden. Maßgeblich ist, was im HTML tatsächlich
 * verlinkt ist — die Hauptdomain nutzt z. B. ef-monogram-cobalt.svg und NICHT
 * das ebenfalls vorhandene assets/favicon.svg. Erst danach wird geraten.
 */
function quelle(dir, erben) {
  const seiten = htmlsOf(dir);
  const zuerst = ['index.html', ...seiten.filter((f) => f !== 'index.html')];

  for (const h of zuerst) {
    if (!fs.existsSync(path.join(dir, h))) continue;
    const src = fs.readFileSync(path.join(dir, h), 'utf8');

    const href = iconHref(src);
    if (!href) continue;
    if (href.startsWith('data:image/svg+xml,')) {
      return { art: 'daten', daten: decodeURIComponent(href.slice('data:image/svg+xml,'.length)), woher: h + ' (data:)' };
    }
    const abs = path.join(dir, href.split('?')[0].replace(/^\//, ''));
    if (fs.existsSync(abs)) {
      return { art: /\.svg$/i.test(abs) ? 'svg' : 'png', datei: abs, woher: href };
    }
  }

  // Kein Verweis im HTML → Datei suchen
  for (const p of ['assets/favicon.svg', 'favicon.svg', 'assets/favicon.png', 'favicon.png']) {
    const abs = path.join(dir, p);
    if (fs.existsSync(abs)) return { art: p.endsWith('.svg') ? 'svg' : 'png', datei: abs, woher: p };
  }

  // Immer noch nichts → vom übergeordneten Auftritt erben
  if (erben && fs.existsSync(erben)) {
    return { art: /\.svg$/i.test(erben) ? 'svg' : 'png', datei: erben, woher: 'geerbt: ' + path.basename(erben) };
  }
  return null;
}

/** ICO-Container aus PNG-Buffern (PNG-in-ICO ist seit Vista überall gültig). */
function buildIco(teile) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(teile.length, 4);
  const dir = Buffer.alloc(16 * teile.length);
  let offset = 6 + 16 * teile.length;
  teile.forEach((t, i) => {
    const o = i * 16;
    dir.writeUInt8(t.size >= 256 ? 0 : t.size, o);
    dir.writeUInt8(t.size >= 256 ? 0 : t.size, o + 1);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(t.buf.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += t.buf.length;
  });
  return Buffer.concat([header, dir, ...teile.map((t) => t.buf)]);
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });

  async function renderSize(q, size) {
    let inner;
    if (q.art === 'svg') {
      inner = fs.readFileSync(q.datei, 'utf8');
    } else if (q.art === 'daten') {
      inner = q.daten;
    } else {
      const b64 = fs.readFileSync(q.datei).toString('base64');
      inner = `<img src="data:image/png;base64,${b64}" style="width:100%;height:100%;object-fit:contain">`;
    }
    const html = `<!doctype html><meta charset="utf-8"><style>
      *{margin:0;padding:0}
      body{width:${size}px;height:${size}px;overflow:hidden}
      svg,img{display:block;width:${size}px;height:${size}px}
    </style>${inner}`;

    const p = await browser.newPage();
    await p.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await p.setContent(html, { waitUntil: 'load' });
    await p.evaluate(() => Promise.all([document.fonts.ready,
      ...[...document.images].map((i) => (i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; })))]));
    await new Promise((r) => setTimeout(r, 120));
    const buf = await p.screenshot({ type: 'png', omitBackground: q.art === 'png' });
    await p.close();
    return buf;
  }

  /**
   * Prüft, ob ein PNG praktisch einfarbig ist — genau daran erkennt man, dass
   * die Icon-Quelle nicht geladen hat (z. B. abgeschnittene data:-URL).
   * Gibt die Farbe als Text zurück, sonst null.
   */
  async function istEinfarbig(pngBuf) {
    const p = await browser.newPage();
    await p.goto('data:text/html,<body>', { waitUntil: 'load' });
    const r = await p.evaluate(async (b64) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      const farben = new Set();
      for (let i = 0; i < d.length; i += 4) farben.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2] + ',' + d[i + 3]);
      return farben.size <= 1 ? [...farben][0] : null;
    }, pngBuf.toString('base64'));
    await p.close();
    return r;
  }

  const bericht = [];
  for (const rel of SITES) {
    const dir = path.join(ROOT, rel);
    if (!fs.existsSync(dir)) { bericht.push([rel, 'Ordner fehlt', '']); continue; }
    // Die privat-Übersicht hat kein eigenes Icon → Marke der Hauptdomain erben
    const q = quelle(dir, path.join(ROOT, 'assets/ef-monogram-cobalt.svg'));
    if (!q) { bericht.push([rel, 'KEINE QUELLE', '']); continue; }

    const hatAssets = fs.existsSync(path.join(dir, 'assets'));
    // Vorhandenes apple-touch-icon respektieren statt ersetzen
    const vorhandenesApple = ['assets/apple-touch-icon.png', 'apple-touch-icon.png']
      .find((p) => fs.existsSync(path.join(dir, p)));
    const appleRel = vorhandenesApple || (hatAssets ? 'assets/favicon-180.png' : 'favicon-180.png');
    const appleSelbstBauen = !vorhandenesApple;

    // Aus einer data:-URL wird eine echte SVG-Datei — Suchmaschinen werten
    // data:-URIs nicht als Favicon, und im HTML steht danach ein sauberer Pfad.
    let svgRel = null;
    if (q.art === 'daten') {
      svgRel = hatAssets ? 'assets/favicon.svg' : 'favicon.svg';
      if (!DRY && !fs.existsSync(path.join(dir, svgRel))) {
        fs.writeFileSync(path.join(dir, svgRel), q.daten.trim() + '\n');
      }
    } else if (q.art === 'svg') {
      svgRel = path.relative(dir, q.datei).split(path.sep).join('/');
    }

    if (!DRY) {
      const teile = [];
      for (const s of [16, 32, 48]) teile.push({ size: s, buf: await renderSize(q, s) });
      // Sicherung: ein komplett einfarbiges Icon heißt, die Quelle war kaputt.
      const pruef = await istEinfarbig(teile[1].buf);
      if (pruef) { bericht.push([rel, 'ABBRUCH: Icon einfarbig (' + pruef + ')', 'nichts geschrieben']); continue; }
      fs.writeFileSync(path.join(dir, 'favicon.ico'), buildIco(teile));
      if (appleSelbstBauen) fs.writeFileSync(path.join(dir, appleRel), await renderSize(q, 180));
    }

    // HTML-Verweise vereinheitlichen
    let gepatcht = 0;
    for (const h of htmlsOf(dir)) {
      const datei = path.join(dir, h);
      let src = fs.readFileSync(datei, 'utf8');
      const vorhandene = [...src.matchAll(/[ \t]*<link[^>]*rel=["'][^"']*icon[^"']*["'][^>]*>\n?/gi)].map((m) => m[0]);

      // Bestehende Datei-Verweise bewahren (data:-URLs werden durch die neue
      // SVG-Datei ersetzt). Reihenfolge: .ico zuerst als breit unterstützter
      // Fallback, dann die scharfe Vektor-/PNG-Variante, dann apple-touch.
      const behalten = vorhandene
        .map((l) => l.trim())
        .filter((l) => !/apple/i.test(l) && !/href=["']?data:/i.test(l) && !/favicon\.ico/i.test(l));
      const zeilen = ['<link rel="icon" href="favicon.ico" sizes="32x32">'];
      if (behalten.length) zeilen.push(...behalten);
      else if (svgRel) zeilen.push(`<link rel="icon" type="image/svg+xml" href="${svgRel}">`);
      zeilen.push(`<link rel="apple-touch-icon" href="${appleRel}">`);
      const block = zeilen.join('\n');

      if (vorhandene.length) {
        src = src.replace(vorhandene[0], block + '\n');
        vorhandene.slice(1).forEach((l) => { src = src.replace(l, ''); });
      } else if (/<\/head>/i.test(src)) {
        src = src.replace(/<\/head>/i, block + '\n</head>');
      } else continue;

      if (!DRY) fs.writeFileSync(datei, src);
      gepatcht++;
    }
    bericht.push([rel, 'aus ' + q.woher, gepatcht + ' Seite(n)']);
  }

  await browser.close();
  console.log(DRY ? '— Probelauf, nichts geschrieben —\n' : '');
  bericht.forEach(([a, b, c]) => console.log('  ' + a.padEnd(34) + b.padEnd(30) + c));
})().catch((e) => { console.error(e); process.exit(1); });
