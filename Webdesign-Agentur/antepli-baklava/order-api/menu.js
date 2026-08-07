/**
 * ANTEPLI — Preis-Menü (Server-Wahrheit) für die Bestell-Validierung.
 * ───────────────────────────────────────────────────────────────────
 * Diese Datei ist die EINZIGE Preisquelle. Was der Browser an Beträgen
 * schickt, wird ignoriert. Bei Menü-Änderungen HIER und in ../shop.js
 * (PRODUCTS) identisch pflegen — die IDs müssen exakt übereinstimmen.
 */

export const CONFIG = {
  minOrder: 15,        // Mindestbestellwert bei Lieferung (€)
  freeFrom: 40,        // ab diesem Warenwert ist die Lieferung frei (€)
  deliveryFee: 3.5,    // Liefergebühr (€)
  currency: 'eur',
  blechLeadDays: 1,    // ganze Bleche: Vorlauf in Tagen (frühestens morgen)
};

/**
 * Öffnungszeiten (Bremer Ortszeit). MUSS mit ../shop.js (HOURS) übereinstimmen.
 * Pro Wochentag (0=So … 6=Sa): Liste von [öffnet, schließt] in Minuten seit Mitternacht.
 * Werte > 1440 bedeuten „geht über Mitternacht hinaus" (1500 = 01:00 am Folgetag).
 * lastOrderMin = letzte Bestellannahme vor Ladenschluss.
 *
 * Antepli laut Website: Mo–Do 10:30–24:00 · Fr–So 10:30–01:00
 */
export const HOURS = {
  tz: 'Europe/Berlin',
  lastOrderMin: 15,
  days: {
    0: [[630, 1500]], // So 10:30 – 01:00
    1: [[630, 1440]], // Mo 10:30 – 24:00
    2: [[630, 1440]], // Di
    3: [[630, 1440]], // Mi
    4: [[630, 1440]], // Do
    5: [[630, 1500]], // Fr 10:30 – 01:00
    6: [[630, 1500]], // Sa 10:30 – 01:00
  },
};

// Bremer Ortszeit als { dow, minutes } — DST-sicher über Intl.
export function localNow(date = new Date()) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: HOURS.tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const p = {};
  for (const x of f.formatToParts(date)) p[x.type] = x.value;
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  let hh = parseInt(p.hour, 10); if (hh === 24) hh = 0;
  return { dow: map[p.weekday], minutes: hh * 60 + parseInt(p.minute, 10) };
}

// true, wenn jetzt (Bremer Zeit) bestellt werden darf.
// Prüft die Spannen von heute UND die von gestern (für Zeiten nach Mitternacht).
export function isOpenNow(date = new Date()) {
  const now = localNow(date);
  const yesterday = (now.dow + 6) % 7;
  const check = (spans, m) => spans.some(([o, c]) => m >= o && m < c - HOURS.lastOrderMin);
  return check(HOURS.days[now.dow] || [], now.minutes)
      || check(HOURS.days[yesterday] || [], now.minutes + 1440);
}

/**
 * Größen-Gruppen. `mult` multipliziert den Basispreis des Artikels.
 *  - gewicht: Basispreis ist der 100-g-Preis  → 250 g = ×2,5
 *  - blech:   Basispreis ist das ganze Blech  → ½ Blech = ×0,6
 */
export const SIZES = {
  gewicht: {
    '250':  { label: '250 g', mult: 2.5, info: 'ca. 8–10 Stück' },
    '500':  { label: '500 g', mult: 5,   info: 'ca. 16–20 Stück' },
    '1000': { label: '1 kg',  mult: 10,  info: 'ca. 32–40 Stück' },
  },
  blech: {
    viertel: { label: '¼ Blech',      mult: 0.35, info: 'ca. 1 kg' },
    halb:    { label: '½ Blech',      mult: 0.6,  info: 'ca. 2 kg' },
    ganz:    { label: 'Ganzes Blech', mult: 1,    info: 'ca. 4 kg' },
  },
};

/**
 * itemId → { name, price (Basispreis in €), cat, sizes (Gruppe oder null) }
 * cat: baklava | warm | getraenke | blech
 */
export const ITEMS = {
  // ── Baklava & Co. (Preis = 100 g bzw. Stück) ───────────────────────────────
  'fistikli-baklava': { name: 'Fıstıklı Baklava', price: 3.5,  cat: 'baklava', sizes: 'gewicht' },
  'sobiyet':          { name: 'Şöbiyet',          price: 3.8,  cat: 'baklava', sizes: 'gewicht' },
  'cevizli-baklava':  { name: 'Cevizli Baklava',  price: 3.2,  cat: 'baklava', sizes: 'gewicht' },
  'soguk-baklava':    { name: 'Soğuk Baklava',    price: 4.5,  cat: 'baklava', sizes: null },
  'havuc-dilimi':     { name: 'Havuç Dilimi',     price: 4.2,  cat: 'baklava', sizes: null },

  // ── Warm & frisch serviert ─────────────────────────────────────────────────
  'fistikli-kunefe':  { name: 'Fıstıklı Künefe',       price: 9.5,  cat: 'warm', sizes: null },
  'kunefe-maras':     { name: 'Künefe mit Maraş-Eis',  price: 11.5, cat: 'warm', sizes: null },
  'katmer':           { name: 'Katmer',                price: 10.5, cat: 'warm', sizes: null },
  'kadayif':          { name: 'Kadayıf',               price: 7.5,  cat: 'warm', sizes: null },

  // ── Getränke ───────────────────────────────────────────────────────────────
  'cay':   { name: 'Çay',               price: 2,   cat: 'getraenke', sizes: null },
  'mokka': { name: 'Türkischer Mokka',  price: 3.5, cat: 'getraenke', sizes: null },

  // ── Ganze Bleche (Preis = ganzes Blech, Vorlauf nötig) ─────────────────────
  'blech-fistikli': { name: 'Blech Fıstıklı Baklava', price: 55, cat: 'blech', sizes: 'blech' },
  'blech-cevizli':  { name: 'Blech Cevizli Baklava',  price: 45, cat: 'blech', sizes: 'blech' },
  'blech-sobiyet':  { name: 'Blech Şöbiyet',          price: 60, cat: 'blech', sizes: 'blech' },
  'blech-havuc':    { name: 'Blech Havuç Dilimi',     price: 58, cat: 'blech', sizes: 'blech' },
};

/**
 * Bewertet einen Warenkorb-Key ("itemId" oder "itemId|größe") serverseitig.
 * Gibt { name, unitPrice, cat, sizeId, sizeLabel } oder null (unbekannt) zurück.
 * Artikel MIT Größengruppe brauchen zwingend eine gültige Größe.
 */
export function priceKey(key) {
  const parts = String(key).split('|');
  const it = ITEMS[parts[0]];
  if (!it) return null;

  let unit = it.price, sizeId = null, sizeLabel = null;
  if (it.sizes) {
    const group = SIZES[it.sizes];
    const s = group && group[parts[1]];
    if (!s) return null;                       // Größe fehlt oder ist unbekannt
    unit = it.price * s.mult;
    sizeId = parts[1]; sizeLabel = s.label;
  } else if (parts[1]) {
    return null;                               // Größe bei größenlosem Artikel
  }
  return {
    name: it.name,
    unitPrice: Math.round(unit * 100) / 100,
    cat: it.cat,
    sizeId, sizeLabel,
  };
}
