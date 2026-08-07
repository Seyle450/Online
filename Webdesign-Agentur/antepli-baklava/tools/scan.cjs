/**
 * Vollscan der Antepli-Seite: tote Links, fehlende Dateien, JS-Fehler,
 * Overflow, Schema, Bilder, Kaufweg. Aufruf: node tools/scan.cjs
 */
const path = require('path');
const fs = require('fs');
const puppeteer = require(require.resolve('puppeteer-core', {
  paths: [path.resolve(__dirname, '../../../../Marketing')],
}));
const DIR = path.join(__dirname, '..');
const SEITEN = ['index.html', 'bestellen.html', 'impressum.html', 'datenschutz.html'];
const url = (f) => 'file:///' + path.resolve(DIR, f).split(path.sep).join('/').replace(/ /g, '%20');

(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
  const probleme = [];
  const merke = (s) => probleme.push(s);

  for (const f of SEITEN) {
    for (const [w, h, label] of [[1440, 950, 'desktop'], [390, 844, 'mobil']]) {
      const p = await b.newPage();
      p.on('pageerror', (e) => merke(f + ' ' + label + ': JS-Fehler — ' + e.message));
      p.on('console', (m) => {
        const t = m.text();
        if (m.type() === 'error' && !/webmanifest|CORS|image-slots|ERR_FILE|net::ERR/.test(t)) merke(f + ' ' + label + ': Konsole — ' + t);
      });
      await p.setViewport({ width: w, height: h });
      await p.goto(url(f), { waitUntil: 'domcontentloaded' });
      await new Promise((r) => setTimeout(r, 1500));

      const r = await p.evaluate(() => {
        const abs = (u) => new URL(u, location.href).href;
        return {
          overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
          h1: document.querySelectorAll('h1').length,
          kaputteBilder: [...document.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src')),
          bilderOhneAlt: [...document.querySelectorAll('img')].filter((i) => !i.getAttribute('alt')).length,
          interneLinks: [...new Set([...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'))
            .filter((x) => x && !/^(https?:|mailto:|tel:|#|javascript:)/.test(x)))],
          anker: [...new Set([...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href')).filter((x) => x.length > 1))],
          schema: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { return JSON.parse(s.textContent)['@type']; } catch { return 'PARSE-FEHLER'; } }),
          leereSlots: [...document.querySelectorAll('image-slot')].filter((s) => { const i = s.shadowRoot && s.shadowRoot.querySelector('img'); return !(i && i.naturalWidth > 0); }).length,
          slots: document.querySelectorAll('image-slot').length,
        };
      });

      if (r.overflow) merke(f + ' ' + label + ': horizontaler Overflow');
      if (label === 'desktop') {
        if (r.h1 !== 1) merke(f + ': ' + r.h1 + ' h1-Überschriften (soll: 1)');
        r.kaputteBilder.forEach((s) => merke(f + ': Bild lädt nicht — ' + s));
        if (r.bilderOhneAlt) merke(f + ': ' + r.bilderOhneAlt + ' Bild(er) ohne alt');
        if (r.leereSlots) merke(f + ': ' + r.leereSlots + '/' + r.slots + ' image-slot(s) leer');
        // interne Ziele prüfen
        r.interneLinks.forEach((l) => {
          const ziel = path.join(DIR, l.split('#')[0].split('?')[0]);
          if (l.split('#')[0] && !fs.existsSync(ziel)) merke(f + ': toter Link — ' + l);
        });
        // Anker auf derselben Seite
        r.anker.forEach(async () => {});
        console.log(f.padEnd(18) + 'h1=' + r.h1 + '  Schema=[' + r.schema.join(',') + ']  Slots=' + (r.slots - r.leereSlots) + '/' + r.slots);
      }
      // Anker prüfen
      if (label === 'desktop') {
        const fehlend = await p.evaluate(() => [...new Set([...document.querySelectorAll('a[href^="#"]')]
          .map((a) => a.getAttribute('href')).filter((x) => x.length > 1))]
          .filter((h) => !document.querySelector(h)));
        fehlend.forEach((a) => merke(f + ': Anker existiert nicht — ' + a));
      }
      await p.close();
    }
  }

  // Kaufweg auf der Startseite: Blech-Konfigurator ohne Vorauswahl
  const p = await b.newPage();
  p.on('pageerror', (e) => merke('Kaufweg: ' + e.message));
  await p.setViewport({ width: 1440, height: 950 });
  await p.goto(url('index.html'), { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1600));
  const start = await p.evaluate(() => ({
    sorteAktiv: document.querySelectorAll('[data-blech-sorte].active').length,
    btn: document.getElementById('blechAdd').textContent.trim(),
    btnAus: document.getElementById('blechAdd').disabled,
    preis: document.getElementById('blechTotal').textContent,
    bild: document.getElementById('blech-foto').getAttribute('src'),
  }));
  await p.click('[data-blech-sorte="blech-sobiyet"]');
  await new Promise((r) => setTimeout(r, 500));
  const nach = await p.evaluate(() => ({
    sorteAktiv: document.querySelectorAll('[data-blech-sorte].active').length,
    btn: document.getElementById('blechAdd').textContent.trim(),
    btnAus: document.getElementById('blechAdd').disabled,
    preis: document.getElementById('blechTotal').textContent,
    bild: document.getElementById('blech-foto').getAttribute('src'),
    bildGeladen: (() => { const s = document.getElementById('blech-foto'); const i = s.shadowRoot && s.shadowRoot.querySelector('img'); return !!(i && i.naturalWidth > 0); })(),
  }));
  console.log('\nBlech-Konfigurator');
  console.log('  vorher : Sorte=' + start.sorteAktiv + '  Preis=' + start.preis + '  Button="' + start.btn + '" (aus=' + start.btnAus + ')  Bild=' + start.bild);
  console.log('  nachher: Sorte=' + nach.sorteAktiv + '  Preis=' + nach.preis + '  Button="' + nach.btn + '" (aus=' + nach.btnAus + ')  Bild=' + nach.bild + ' geladen=' + nach.bildGeladen);
  if (start.sorteAktiv !== 0) merke('Blech: beim Laden ist schon eine Sorte gewählt');
  if (!start.btnAus) merke('Blech: Button ohne Sortenwahl nicht gesperrt');
  if (!nach.bildGeladen) merke('Blech: Produktbild lädt nicht');
  await p.close();

  console.log('\n' + '='.repeat(66));
  if (probleme.length) { console.log('BEFUNDE (' + probleme.length + '):'); [...new Set(probleme)].forEach((x) => console.log('  • ' + x)); }
  else console.log('Keine Befunde.');
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
