/**
 * Preis-Menü (Server-Wahrheit) für die Bestell-Validierung.
 * Aus ../script.js extrahiert — bei Menü-Änderungen HIER mitpflegen
 * (oder neu extrahieren). 'art' = WinOrder-Artikelnummer:
 * PLATZHALTER (1000+) — vom Kunden mit den echten WinOrder-Nummern ersetzen!
 */
export const CONFIG = {
  "minOrder": 12,
  "freeFrom": 20,
  "deliveryFee": 1.5,
  "currency": "eur"
};

/**
 * Öffnungszeiten (Bremer Ortszeit). MUSS mit ../script.js (HOURS) übereinstimmen.
 * Pro Wochentag (0=So … 6=Sa): Liste von [öffnet, schließt] in Minuten seit Mitternacht.
 * Leeres Array = an dem Tag geschlossen. lastOrderMin = letzte Bestellung vor Ladenschluss.
 * Beispielzeiten — vom Kunden mit den echten Zeiten ersetzen.
 */
export const HOURS = {
  tz: "Europe/Berlin",
  lastOrderMin: 15,
  days: {
    0: [[11 * 60, 22 * 60]], 1: [[11 * 60, 22 * 60]], 2: [[11 * 60, 22 * 60]],
    3: [[11 * 60, 22 * 60]], 4: [[11 * 60, 22 * 60]], 5: [[11 * 60, 22 * 60]], 6: [[11 * 60, 22 * 60]],
  },
};

// Bremer Ortszeit als { dow, minutes } — DST-sicher über Intl.
export function localNow(date = new Date()) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: HOURS.tz, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  const p = {};
  for (const x of f.formatToParts(date)) p[x.type] = x.value;
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  let hh = parseInt(p.hour, 10); if (hh === 24) hh = 0;
  return { dow: map[p.weekday], minutes: hh * 60 + parseInt(p.minute, 10) };
}

// true, wenn jetzt (Bremer Zeit) bestellt werden darf.
export function isOpenNow(date = new Date()) {
  const now = localNow(date);
  const spans = HOURS.days[now.dow] || [];
  for (const [o, c] of spans) {
    if (now.minutes >= o && now.minutes < c - HOURS.lastOrderMin) return true;
  }
  return false;
}

// Größen-Aufpreise (nur Pizza)
export const SIZES = {
  "klein": { label: "Klein", add: 0 },
  "mittel": { label: "Mittel", add: 2.5 },
  "gross": { label: "Groß", add: 5 },
};

export const PIZZA_CAT = 'pizza';

// itemId → { name, price (klein/Basispreis), cat, art }
export const ITEMS = {
  "margheritapizza": { name: "Margherita", price: 8, cat: "pizza", art: "1000" },
  "salamipizza": { name: "Salami", price: 9, cat: "pizza", art: "1001" },
  "funghipizza": { name: "Funghi", price: 9, cat: "pizza", art: "1002" },
  "hawaiipizza": { name: "Hawaii", price: 9.5, cat: "pizza", art: "1003" },
  "tonnopizza": { name: "Tonno", price: 10, cat: "pizza", art: "1004" },
  "diavolopizza": { name: "Diavolo", price: 10.5, cat: "pizza", art: "1005" },
  "vegetariapizza": { name: "Vegetaria", price: 10, cat: "pizza", art: "1006" },
  "blitzspezialpizza": { name: "Blitz Spezial", price: 11.5, cat: "pizza", art: "1007" },
  "calzoneclassicocalzone": { name: "Calzone Classico", price: 10.5, cat: "calzone", art: "1008" },
  "calzonevegetalecalzone": { name: "Calzone Vegetale", price: 10, cat: "calzone", art: "1009" },
  "calzoneblitzcalzone": { name: "Calzone Blitz", price: 11.5, cat: "calzone", art: "1010" },
  "nudelauflaufschinkenauflauf": { name: "Nudel-Auflauf Schinken", price: 9.5, cat: "auflauf", art: "1011" },
  "broccoliauflaufauflauf": { name: "Broccoli-Auflauf", price: 9, cat: "auflauf", art: "1012" },
  "tortelliniauflaufauflauf": { name: "Tortellini-Auflauf", price: 10, cat: "auflauf", art: "1013" },
  "rollohhnchenrollo": { name: "Rollo Hähnchen", price: 9.5, cat: "rollo", art: "1014" },
  "rollosucukrollo": { name: "Rollo Sucuk", price: 9.5, cat: "rollo", art: "1015" },
  "rollovegetarischrollo": { name: "Rollo Vegetarisch", price: 8.5, cat: "rollo", art: "1016" },
  "rollofalafelrollo": { name: "Rollo Falafel", price: 8.5, cat: "rollo", art: "1017" },
  "baguettesalamibaguette": { name: "Baguette Salami", price: 7.5, cat: "baguette", art: "1018" },
  "baguettehhnchenbaguette": { name: "Baguette Hähnchen", price: 8, cat: "baguette", art: "1019" },
  "baguettemozzarellabaguette": { name: "Baguette Mozzarella", price: 7.5, cat: "baguette", art: "1020" },
  "spaghettibolognesenudeln": { name: "Spaghetti Bolognese", price: 8.5, cat: "nudeln", art: "1021" },
  "pennearrabbiatanudeln": { name: "Penne Arrabbiata", price: 8, cat: "nudeln", art: "1022" },
  "tortellinipannanudeln": { name: "Tortellini Panna", price: 9, cat: "nudeln", art: "1023" },
  "spaghettinapolinudeln": { name: "Spaghetti Napoli", price: 7.5, cat: "nudeln", art: "1024" },
  "gemischtersalatsalate": { name: "Gemischter Salat", price: 6.5, cat: "salate", art: "1025" },
  "bauernsalatsalate": { name: "Bauernsalat", price: 7.5, cat: "salate", art: "1026" },
  "thunfischsalatsalate": { name: "Thunfischsalat", price: 8, cat: "salate", art: "1027" },
  "mozzarellasalatsalate": { name: "Mozzarella-Salat", price: 8, cat: "salate", art: "1028" },
  "pizzabrtchen6stkbeilagen": { name: "Pizzabrötchen (6 Stk.)", price: 4, cat: "beilagen", art: "1029" },
  "pizzabrtchengefllt6stkbeilagen": { name: "Pizzabrötchen gefüllt (6 Stk.)", price: 5.5, cat: "beilagen", art: "1030" },
  "pommesfritesbeilagen": { name: "Pommes Frites", price: 3.5, cat: "beilagen", art: "1031" },
  "chickenwings6stkbeilagen": { name: "Chicken Wings (6 Stk.)", price: 6, cat: "beilagen", art: "1032" },
  "tiramisunachtisch": { name: "Tiramisu", price: 4.5, cat: "nachtisch", art: "1033" },
  "milchreisnachtisch": { name: "Milchreis", price: 3.5, cat: "nachtisch", art: "1034" },
  "benjerrys465mlnachtisch": { name: "Ben & Jerry's (465 ml)", price: 8.5, cat: "nachtisch", art: "1035" },
  "cocacolafantasprite1lgetraenke": { name: "Coca-Cola / Fanta / Sprite (1 l)", price: 3, cat: "getraenke", art: "1036" },
  "wasser05lgetraenke": { name: "Wasser (0,5 l)", price: 2, cat: "getraenke", art: "1037" },
  "eisteepfirsich05lgetraenke": { name: "Eistee Pfirsich (0,5 l)", price: 2.5, cat: "getraenke", art: "1038" },
  "becks033lgetraenke": { name: "Beck's (0,33 l)", price: 2.5, cat: "getraenke", art: "1039" },
};

/**
 * Bewertet einen Warenkorb-Key ("itemId" oder "itemId|größe") serverseitig.
 * Gibt { name, unitPrice, art, sizeId, sizeLabel } oder null (unbekannt) zurück.
 */
export function priceKey(key) {
  const parts = String(key).split('|');
  const it = ITEMS[parts[0]];
  if (!it) return null;
  let unit = it.price, sizeId = null, sizeLabel = null;
  if (parts[1]) {
    const s = SIZES[parts[1]];
    if (!s) return null;
    unit += s.add; sizeId = parts[1]; sizeLabel = s.label;
  }
  return { name: it.name, unitPrice: Math.round(unit * 100) / 100, art: it.art, sizeId, sizeLabel };
}
