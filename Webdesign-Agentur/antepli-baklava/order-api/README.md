# ANTEPLI – Bestell-Backend (Stripe → Telegram)

Cloudflare Worker, der Bestellungen serverseitig prüft, per **Stripe Checkout** kassiert
und die bezahlte Bestellung als Küchen-Ticket ablegt + per **Telegram** meldet.

- **Worker-URL (geplant):** https://antepli-orders.seyle450.workers.dev
- **Frontend:** `../bestellen.html` (volle Karte) + `../index.html` (Section „Beliebte Produkte")
- **Gemeinsame Logik:** `../shop.js` (Warenkorb, Kasse, Größenwahl — auf beiden Seiten)
- **Preis-Wahrheit:** `menu.js` (Preise, Größen & Öffnungszeiten – der Client kann nichts fälschen)

Aufgebaut wie das Pizza-Blitz-Backend (`Portfolio/privat/pizza blitz/order-api/`),
aber ohne WinOrder: statt einer Kassen-Schnittstelle gibt es ein Küchen-Ticket im KV
plus Telegram-Nachricht.

---

## Zwei Betriebsarten

**Konzept-Modus** (automatisch, solange kein `STRIPE_SECRET_KEY` gesetzt ist — oder erzwungen
über `DEMO_MODE = "1"`): Es wird **nicht kassiert**. Die Bestellung wird trotzdem serverseitig
geprüft, im KV gespeichert und **per Telegram gemeldet**. Der Worker antwortet
`{"demo":true,"orderId":…}`, worauf das Frontend einen Konzept-Bestätigungsschirm zeigt
(„Das war eine Testbestellung — es wurde nichts bestellt und nichts bezahlt").

**Echtbetrieb** (sobald `STRIPE_SECRET_KEY` gesetzt und `DEMO_MODE` nicht `1` ist):
Stripe Checkout wie gewohnt, Telegram-Meldung erst nach bestätigter Zahlung über den Webhook.

Im Frontend gehört dazu `KONZEPT_MODUS` in `../shop.js` (Kopfbereich): steuert den Warnhinweis
in der Kasse und die Button-Beschriftung. Beim Live-Gang auf `false` setzen.

---

## Status

- [x] Worker-Code fertig (`index.js`, `menu.js`) inkl. Konzept-Modus
- [x] Frontend fertig (Warenkorb, Kasse, Konzept-Bestätigung, Analytics)
- [ ] **KV-Namespace anlegen** ← nächster Schritt
- [ ] **Telegram-Secrets setzen**
- [ ] **Worker deployen** → ab hier laufen Testbestellungen per Telegram ein
- [ ] Stripe-Keys + Webhook (erst für den Echtbetrieb nötig)

`GET /health` zeigt danach: `{"ok":true,"demo":true,"stripe":false,"telegram":true,"open":…}`.

### Schnellstart für Telegram-Meldungen (ohne Stripe)

```
npx wrangler kv namespace create ORDERS      # id in wrangler.toml eintragen
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID     # 5895145432
npx wrangler deploy
```
Danach löst jede Testbestellung auf der Seite eine Telegram-Nachricht aus.

---

## 1. KV-Namespace anlegen

Im Ordner `order-api/`:

```
npx wrangler kv namespace create ORDERS
```
Die ausgegebene `id` in `wrangler.toml` eintragen (ersetzt `TODO_KV_NAMESPACE_ID`).

## 2. Stripe-Testkonto + Secret Key

1. Konto auf https://dashboard.stripe.com — oben links **Testmodus** aktiv lassen.
2. Developers → **API keys** → *Secret key* kopieren (`sk_test_…`).
3. ```
   npx wrangler secret put STRIPE_SECRET_KEY
   ```

## 3. Worker deployen

```
npx wrangler deploy
```

## 4. Webhook in Stripe anlegen

1. Developers → **Webhooks** → *Add endpoint*.
2. Endpoint-URL: `https://antepli-orders.seyle450.workers.dev/webhook`
3. Event: **`checkout.session.completed`**
4. **Signing secret** (`whsec_…`) kopieren und setzen:
   ```
   npx wrangler secret put STRIPE_WEBHOOK_SECRET
   ```

## 5. Telegram-Benachrichtigung

```
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID     # 5895145432
```
Danach nochmal `npx wrangler deploy`.

---

## Testen (End-to-End im Testmodus)

1. `bestellen.html` öffnen, Artikel in den Warenkorb, **Zur Kasse** → Formular → **Jetzt bezahlen**.
2. Stripe-Checkout mit **Testkarte** bezahlen: `4242 4242 4242 4242`, beliebiges künftiges
   Datum, beliebige CVC/PLZ.
3. Rückkehr auf `bestellen.html?bestellung=ok&oid=…` → Warenkorb geleert, Bestätigungs-Screen
   mit Bestellnummer, Positionen und Termin.
4. Kontrolle: `GET /order/<oid>` → `"status":"paid"`. Telegram-Nachricht sollte da sein.
5. Im KV liegen `order:<id>` und (nach Zahlung) `ticket:<id>` — TTL 30 Tage.

Außerhalb der Öffnungszeiten heißt der Button „Geschlossen", und `/checkout` lehnt
serverseitig ab.

---

## Menü ändern

Preise, Artikel und Größen stehen an **zwei** Stellen und müssen identisch bleiben —
die IDs sind der Schlüssel:

| Datei | Rolle |
|---|---|
| `menu.js` (`ITEMS`, `SIZES`, `CONFIG`) | verbindlich, rechnet die Bestellung |
| `../shop.js` (`PRODUCTS`, `SIZES`, `CONFIG`) | nur Anzeige (Karten, Warenkorb, Summen) |

Nach Änderungen an `menu.js`: `npx wrangler deploy`.

**Größen-Systematik:** `mult` multipliziert den Basispreis.
- Gruppe `gewicht` — Basispreis ist der **100-g-Preis** (250 g = ×2,5 · 500 g = ×5 · 1 kg = ×10)
- Gruppe `blech` — Basispreis ist das **ganze Blech** (¼ = ×0,35 · ½ = ×0,6 · ganz = ×1)

## Öffnungszeiten ändern

An **zwei** Stellen identisch pflegen (`HOURS.days`): `../shop.js` und `menu.js`.
Format je Wochentag (0 = So … 6 = Sa): `[[öffnet, schließt]]` in Minuten seit Mitternacht.
Werte **über 1440** bedeuten „geht über Mitternacht": `[[630, 1500]]` = 10:30 bis 01:00 nachts.
`lastOrderMin` = Annahmeschluss vor Ladenschluss (aktuell 15 Min).

Aktuell: Mo–Do `[[630, 1440]]` · Fr–So `[[630, 1500]]`.

## Liefer-Konditionen ändern

In `CONFIG` (beide Dateien): `minOrder` 15 € · `deliveryFee` 3,50 € · `freeFrom` 40 €
· `blechLeadDays` 1 (Vorlauf für ganze Bleche). Die Zahlen stehen zusätzlich als Text in
`../bestellen.html` (`.shop-facts`) und in der CTA-Zeile auf `../index.html` — dort mitziehen.

---

## Vor dem echten Live-Betrieb

1. **Echte Preise & Sorten** vom Kunden holen — die aktuellen sind Beispielwerte
   aus der Speisekarte der Konzeptseite.
2. **Liefergebiet klären** (aktuell nur Text „Bremen" — keine PLZ-Prüfung im Worker).
   Falls nötig: erlaubte PLZ in `buildOrder()` prüfen.
3. **Stripe Live-Modus:** `sk_live_…` als `STRIPE_SECRET_KEY`, neuen Live-Webhook + `whsec_…`.
4. **Konzept-Hinweis** (`.elycn`-Popup) auf beiden Seiten entfernen.
5. **`ALLOWED_ORIGINS`** in `index.js` um die echte Domain ergänzen.
6. **Impressum/Datenschutz** als echte Seiten anlegen — Pflicht, sobald wirklich kassiert wird.
   Aktuell verweist der Footer nur auf elyesferchichi.com.
