/** Nachprüfung: Favicons über alle Sites — Dateien, ICO-Struktur, Verweise, Inhalt. */
const path = require('path');
const fs = require('fs');
const puppeteer = require(require.resolve('puppeteer-core', { paths: [path.resolve(__dirname, '../../Marketing')] }));
const ROOT = path.resolve(__dirname, '..');

const SITES = [
  '.', 'analytics', 'privat',
  'privat/bay', 'privat/cafe-petit', 'privat/coffee-corner', 'privat/dilans',
  'privat/farfalla', 'privat/grundschule-am-halmerweg', 'privat/habitat',
  'privat/hochzeit', 'privat/kleiner-olymp', 'privat/pizza blitz', 'privat/traumclean',
  'Webdesign-Agentur/Starscape', 'Webdesign-Agentur/antepli-baklava', 'Webdesign-Agentur/bens',
  'Webdesign-Agentur/cafe-niki', 'Webdesign-Agentur/hevis', 'Webdesign-Agentur/lokma-lovers',
];

(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
  const probleme = [];
  console.log('SITE'.padEnd(34) + 'ICO'.padEnd(22) + 'apple'.padEnd(26) + 'Seiten ok');
  console.log('-'.repeat(100));

  for (const rel of SITES) {
    const dir = path.join(ROOT, rel);
    const icoPfad = path.join(dir, 'favicon.ico');
    let icoInfo = 'FEHLT';
    if (fs.existsSync(icoPfad)) {
      const b = fs.readFileSync(icoPfad);
      const typ = b.readUInt16LE(2), n = b.readUInt16LE(4);
      const groessen = [];
      for (let i = 0; i < n; i++) { const w = b.readUInt8(6 + i * 16); groessen.push(w || 256); }
      icoInfo = (typ === 1 ? '' : 'TYP?') + groessen.join('/') + ' ' + (b.length / 1024).toFixed(1) + 'KB';
      if (typ !== 1) probleme.push(rel + ': ICO-Typ falsch');
    } else probleme.push(rel + ': favicon.ico fehlt');

    // Verweise je HTML-Seite prüfen
    const htmls = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.html'));
    let ok = 0; let appleDatei = '—';
    for (const h of htmls) {
      const p = await browser.newPage();
      await p.goto('file:///' + path.join(dir, h).split(path.sep).join('/').replace(/ /g, '%20'), { waitUntil: 'domcontentloaded' });
      const r = await p.evaluate(() => [...document.querySelectorAll('link[rel*="icon"]')]
        .map((l) => l.rel + '|' + l.getAttribute('href')));
      await p.close();
      const hrefs = r.map((x) => x.split('|')[1]);
      const hatIco = hrefs.some((x) => /favicon\.ico/.test(x));
      const apple = r.find((x) => /apple/.test(x));
      if (apple) appleDatei = apple.split('|')[1];
      // referenzierte Dateien müssen existieren
      const fehlend = hrefs.filter((x) => x && !/^(data:|https?:)/.test(x) &&
        !fs.existsSync(path.join(dir, x.split('?')[0].replace(/^\//, ''))));
      if (hatIco && apple && !fehlend.length) ok++;
      else probleme.push(rel + '/' + h + ': ' + (!hatIco ? 'kein .ico-Verweis ' : '') + (!apple ? 'kein apple-touch ' : '') + (fehlend.length ? 'fehlende Datei ' + fehlend.join(',') : ''));
    }

    // Inhalt: ist das 32px-Icon nicht komplett leer/einfarbig?
    let inhalt = '';
    if (fs.existsSync(icoPfad)) {
      const p = await browser.newPage();
      await p.setViewport({ width: 32, height: 32 });
      await p.goto('file:///' + icoPfad.split(path.sep).join('/').replace(/ /g, '%20'), { waitUntil: 'load' }).catch(() => {});
      await p.close();
    }
    console.log(rel.padEnd(34) + icoInfo.padEnd(22) + String(appleDatei).padEnd(26) + ok + '/' + htmls.length + inhalt);
  }

  await browser.close();
  console.log('\n' + (probleme.length ? 'PROBLEME:\n  ' + probleme.join('\n  ') : 'Keine Probleme.'));
})().catch((e) => { console.error(e); process.exit(1); });
