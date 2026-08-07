/**
 * Bilder fürs Web aufbereiten.
 *
 * 1) Produktbilder  assets/produkte/*.png  (1024², freigestellt, ~1,8 MB je Datei)
 *    → 600² WebP mit Alpha, ~40–80 KB. Die Originale wandern nach
 *      assets/produkte/_original/ und werden nicht deployed (SKIP im Workflow).
 *
 * 2) Die vier Fotos, die Elyes als image*.png abgelegt hat, bekommen sprechende
 *    Namen und werden ebenfalls zu WebP.
 *
 * Der Ablauf ist wiederholbar: neue PNGs in assets/produkte/ legen, Skript
 * laufen lassen. Bereits optimierte Dateien werden übersprungen.
 *
 * Aufruf:  node tools/optimiere-bilder.cjs
 */
const path = require('path');
const fs = require('fs');
const puppeteer = require(require.resolve('puppeteer-core', {
  paths: [path.resolve(__dirname, '../../../../Marketing')],
}));

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const DIR = path.join(__dirname, '..');
const ASSETS = path.join(DIR, 'assets');
const PRODUKTE = path.join(ASSETS, 'produkte');
const ORIGINAL = path.join(PRODUKTE, '_original');

// Die vier von Elyes abgelegten Fotos → sprechende Namen + Zielbreite.
// Reihenfolge/Zuordnung ergibt sich aus dem Motiv, siehe Kommentar.
const FOTOS = [
  // vier Baklava-Stücke auf grüner Marmorplatte — das beste Hero-Motiv
  { von: 'image copy.png', nach: 'hero-baklava', breite: 900 },
  // Künefe in der Kupferpfanne — warmes Gegenstück im kleinen Hero-Feld
  { von: 'image copy 3.png', nach: 'hero-kunefe', breite: 760 },
  // ganze Bleche nebeneinander — gehört zur Blech-Section
  { von: 'image copy 2.png', nach: 'bleche', breite: 700 },
  // Flatlay mit vielen Sorten — Kopf der Bestellseite
  { von: 'image.png', nach: 'auswahl', breite: 760 },
];

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const seite = await browser.newPage();
  await seite.goto('data:text/html,<body>', { waitUntil: 'load' });

  /** PNG → WebP, auf `breite` skaliert. Alpha bleibt erhalten. */
  async function zuWebp(quellPfad, zielPfad, breite, qualitaet) {
    const src = 'data:image/png;base64,' + fs.readFileSync(quellPfad).toString('base64');
    const daten = await seite.evaluate(async (s, b, q) => {
      const img = new Image();
      img.src = s;
      await img.decode();
      const skala = Math.min(1, b / img.width);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * skala);
      c.height = Math.round(img.height * skala);
      const x = c.getContext('2d');
      x.imageSmoothingQuality = 'high';
      x.drawImage(img, 0, 0, c.width, c.height);
      return { url: c.toDataURL('image/webp', q), w: c.width, h: c.height };
    }, src, breite, qualitaet);
    fs.writeFileSync(zielPfad, Buffer.from(daten.url.split(',')[1], 'base64'));
    return daten;
  }

  const mb = (p) => (fs.statSync(p).size / 1024).toFixed(0) + ' KB';

  // ── 1) Produktbilder ──────────────────────────────────────────────────────
  if (!fs.existsSync(ORIGINAL)) fs.mkdirSync(ORIGINAL, { recursive: true });
  const pngs = fs.readdirSync(PRODUKTE).filter((f) => f.toLowerCase().endsWith('.png')).sort();

  console.log('── Produktbilder ─────────────────────────────────────────────');
  let vorher = 0, nachher = 0;
  for (const f of pngs) {
    const quelle = path.join(PRODUKTE, f);
    const ziel = path.join(PRODUKTE, f.replace(/\.png$/i, '.webp'));
    vorher += fs.statSync(quelle).size;
    const d = await zuWebp(quelle, ziel, 600, 0.86);
    nachher += fs.statSync(ziel).size;
    // Original sichern statt löschen — Elyes soll seine Vorlagen behalten
    fs.renameSync(quelle, path.join(ORIGINAL, f));
    console.log('  ' + f.replace(/\.png$/, '').padEnd(22) + (d.w + 'x' + d.h).padEnd(11) + mb(ziel));
  }
  if (pngs.length) {
    console.log('  ' + ''.padEnd(22) + 'gesamt: ' + (vorher / 1024 / 1024).toFixed(1) + ' MB → '
      + (nachher / 1024).toFixed(0) + ' KB');
  } else {
    console.log('  (keine neuen PNGs — alles schon optimiert)');
  }

  // ── 2) Die vier Fotos ─────────────────────────────────────────────────────
  console.log('\n── Fotos ─────────────────────────────────────────────────────');
  for (const f of FOTOS) {
    const quelle = path.join(ASSETS, f.von);
    if (!fs.existsSync(quelle)) { console.log('  ' + f.nach.padEnd(22) + 'Quelle fehlt (schon verarbeitet?)'); continue; }
    const ziel = path.join(ASSETS, f.nach + '.webp');
    const d = await zuWebp(quelle, ziel, f.breite, 0.84);
    fs.renameSync(quelle, path.join(ORIGINAL, f.von));
    console.log('  ' + f.nach.padEnd(22) + (d.w + 'x' + d.h).padEnd(11) + mb(ziel) + '   ← ' + f.von);
  }

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
