/**
 * Erzeugt das Menu-Schema (JSON-LD) für ../bestellen.html aus menu.js —
 * damit Preise in der Google-Anzeige nie von der Kasse abweichen.
 *
 *   node gen-schema.mjs            → gibt den <script>-Block aus
 *   node gen-schema.mjs --write    → schreibt ihn direkt in ../bestellen.html
 *
 * Der Block in bestellen.html ist mit
 *   <!-- MENU-SCHEMA:START --> … <!-- MENU-SCHEMA:END -->
 * markiert und wird beim Schreiben ersetzt.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ITEMS, SIZES, CONFIG } from './menu.js';

const BASE = 'https://antepli.elyesferchichi.com';
const dir = path.dirname(fileURLToPath(import.meta.url));
const TARGET = path.join(dir, '..', 'bestellen.html');

const SECTIONS = [
  { cat: 'baklava',   name: 'Baklava & Co.',          desc: 'Frisch gezogen, mit Antep-Pistazien' },
  { cat: 'warm',      name: 'Warm & frisch serviert', desc: 'Wird auf Bestellung zubereitet' },
  { cat: 'getraenke', name: 'Çay & Mokka',            desc: 'Türkischer Tee und Mokka' },
  { cat: 'blech',     name: 'Ganze Bleche',           desc: 'Für Feiern — mindestens einen Tag Vorlauf' },
];

// Schema.org verlangt den Punkt als Dezimaltrenner; Fließtext bleibt deutsch.
const eur = (n) => (Math.round(n * 100) / 100).toFixed(2);
const de = (n) => eur(n).replace('.', ',');

// Ein Artikel → MenuItem. Artikel mit Größen bekommen je Größe ein Offer.
function menuItem(id, it) {
  const offers = it.sizes
    ? Object.entries(SIZES[it.sizes]).map(([sid, s]) => ({
        '@type': 'Offer',
        name: s.label,
        price: eur(it.price * s.mult),
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
      }))
    : [{
        '@type': 'Offer',
        price: eur(it.price),
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
      }];
  const node = { '@type': 'MenuItem', name: it.name, offers };
  if (it.sizes === 'gewicht') node.description = de(it.price) + ' € je 100 g';
  if (it.sizes === 'blech') node.description = 'Ganzes Blech ca. 4 kg · auch als ¼ und ½ Blech';
  return node;
}

const menu = {
  '@context': 'https://schema.org',
  '@type': 'Menu',
  '@id': BASE + '/bestellen.html#menu',
  name: 'Speisekarte ANTEPLI',
  inLanguage: 'de-DE',
  url: BASE + '/bestellen.html',
  hasMenuSection: SECTIONS.map((s) => ({
    '@type': 'MenuSection',
    name: s.name,
    description: s.desc,
    hasMenuItem: Object.entries(ITEMS)
      .filter(([, it]) => it.cat === s.cat)
      .map(([id, it]) => menuItem(id, it)),
  })),
};

const bakery = {
  '@context': 'https://schema.org',
  '@type': 'Bakery',
  '@id': BASE + '/#bakery',
  name: 'ANTEPLI',
  url: BASE + '/',
  image: BASE + '/assets/og-image.jpg',
  servesCuisine: ['Türkisch', 'Baklava', 'Künefe', 'Dessert'],
  priceRange: '€€',
  currenciesAccepted: 'EUR',
  paymentAccepted: 'Karte, Apple Pay, Google Pay, Bar',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Waller Ring 121a',
    postalCode: '28219',
    addressLocality: 'Bremen',
    addressCountry: 'DE',
  },
  areaServed: { '@type': 'City', name: 'Bremen' },
  hasMenu: { '@id': BASE + '/bestellen.html#menu' },
  openingHoursSpecification: [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'], opens: '10:30', closes: '23:59' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Friday', 'Saturday', 'Sunday'], opens: '10:30', closes: '01:00' },
  ],
  // Lieferbedingungen aus CONFIG — bleibt automatisch synchron
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Lieferung & Abholung',
    itemListElement: [
      {
        '@type': 'Offer',
        name: 'Abholung',
        description: 'Kostenlos am Waller Ring 121a',
        price: '0.00', priceCurrency: 'EUR',
        eligibleTransactionVolume: {
          '@type': 'PriceSpecification', price: '0.00', priceCurrency: 'EUR',
        },
      },
      {
        '@type': 'Offer',
        name: 'Lieferung in Bremen',
        description: 'Liefergebühr ' + de(CONFIG.deliveryFee) + ' € · ab ' + de(CONFIG.freeFrom) + ' € kostenlos',
        price: eur(CONFIG.deliveryFee), priceCurrency: 'EUR',
        eligibleTransactionVolume: {
          '@type': 'PriceSpecification', price: eur(CONFIG.minOrder), priceCurrency: 'EUR',
          description: 'Mindestbestellwert',
        },
      },
    ],
  },
  sameAs: ['https://www.instagram.com/anteplibaklava.de/'],
};

const block =
  '<!-- MENU-SCHEMA:START — erzeugt von order-api/gen-schema.mjs, nicht von Hand ändern -->\n' +
  '<script type="application/ld+json">\n' + JSON.stringify(bakery, null, 2) + '\n</' + 'script>\n' +
  '<script type="application/ld+json">\n' + JSON.stringify(menu, null, 2) + '\n</' + 'script>\n' +
  '<!-- MENU-SCHEMA:END -->';

if (process.argv.includes('--write')) {
  const html = fs.readFileSync(TARGET, 'utf8');
  const re = /<!-- MENU-SCHEMA:START[\s\S]*?<!-- MENU-SCHEMA:END -->/;
  if (!re.test(html)) {
    console.error('Marker <!-- MENU-SCHEMA:START --> … :END fehlt in bestellen.html.');
    process.exit(1);
  }
  fs.writeFileSync(TARGET, html.replace(re, block));
  const items = menu.hasMenuSection.reduce((n, s) => n + s.hasMenuItem.length, 0);
  console.log('bestellen.html aktualisiert — ' + menu.hasMenuSection.length + ' Sektionen, ' + items + ' Artikel.');
} else {
  console.log(block);
}
