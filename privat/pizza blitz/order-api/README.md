# Pizza Blitz – Bestell-Backend (Stripe → WinOrder)

Cloudflare Worker, der Bestellungen serverseitig prüft, per **Stripe Checkout** kassiert
und die bezahlte Bestellung für die Übergabe an **WinOrder** aufbereitet.

- **Worker-URL:** https://pizza-blitz-orders.seyle450.workers.dev
- **Frontend:** `../index.html` / `../script.js` (Warenkorb + Kasse-Modal)
- **Preis-Wahrheit:** `menu.js` (Preise & Öffnungszeiten – Client kann nichts fälschen)

---

## Status (was schon eingerichtet ist)

- [x] Worker deployed
- [x] KV-Namespace `ORDERS` angelegt und gebunden (id in `wrangler.toml`)
- [x] Origin-Härtung: `/checkout` nur von elyesferchichi.com, *.elyesferchichi.com,
      pizzablitz-bremen.de, localhost → sonst **403**
- [x] Öffnungszeiten erzwungen (Bremer Zeit, aktuell **Beispiel Mo–So 11–22**, 15 Min Annahmeschluss)
- [x] Webhook-Signaturprüfung (HMAC-SHA256), Preise werden immer neu gerechnet
- [ ] **Stripe-Keys setzen** ← nächster Schritt (siehe unten)
- [ ] **Webhook in Stripe anlegen**
- [ ] Frontend live schalten (IONOS/GitHub)
- [ ] Vor Live-Betrieb: echte WinOrder-Artikelnummern + Zustellweg (Phase 3)

`GET /health` zeigt, ob Stripe schon konfiguriert ist: `{"ok":true,"stripe":false}`.

---

## 1. Stripe-Testkonto + Secret Key

1. Konto auf https://dashboard.stripe.com anlegen (kostenlos). Oben links **Testmodus** aktiv lassen.
2. Developers → **API keys** → *Secret key* kopieren (beginnt mit `sk_test_…`).
3. Als Secret setzen (im Ordner `order-api/`):
   ```
   npx wrangler secret put STRIPE_SECRET_KEY
   ```
   → beim Prompt den `sk_test_…`-Key einfügen.

## 2. Webhook in Stripe anlegen

1. Developers → **Webhooks** → *Add endpoint*.
2. Endpoint-URL:
   ```
   https://pizza-blitz-orders.seyle450.workers.dev/webhook
   ```
3. Event auswählen: **`checkout.session.completed`**.
4. Nach dem Anlegen den **Signing secret** kopieren (`whsec_…`) und setzen:
   ```
   npx wrangler secret put STRIPE_WEBHOOK_SECRET
   ```

## 3. (Optional) Telegram-Benachrichtigung bei neuer Bestellung

1. In Telegram **@BotFather** → `/newbot` → Bot-Token kopieren.
2. Eigene Chat-ID herausfinden (z. B. Bot anschreiben, dann
   `https://api.telegram.org/bot<TOKEN>/getUpdates` → `chat.id`).
3. Setzen:
   ```
   npx wrangler secret put TELEGRAM_BOT_TOKEN
   npx wrangler secret put TELEGRAM_CHAT_ID
   ```

## 4. Nach dem Setzen neu deployen

```
npx wrangler deploy
```
`GET /health` sollte nun `"stripe":true` zeigen.

---

## Testen (End-to-End im Testmodus)

1. Frontend öffnen, Artikel in den Warenkorb, **Zur Kasse** → Formular ausfüllen → **Jetzt bezahlen**.
2. Stripe-Checkout mit **Testkarte** bezahlen:
   - Karte `4242 4242 4242 4242`, beliebiges künftiges Datum, beliebige CVC/PLZ.
3. Rückkehr auf die Seite mit `?bestellung=ok` → Warenkorb geleert, „Danke"-Ansicht im Blitz-Tracker.
4. Kontrolle: `GET /order/<oid>` → `"status":"paid"`. Optional Telegram-Nachricht.
5. Gespeicherte Daten im KV: Schlüssel `order:<id>` und (nach Zahlung) `winorder:<id>` (14 Tage TTL).

Bestellungen außerhalb der Öffnungszeiten werden abgelehnt – Button heißt dann „Geschlossen".

---

## Öffnungszeiten ändern

An **zwei** Stellen identisch pflegen (`HOURS.days`):
- `../script.js` (Frontend)
- `menu.js` (Server) — danach `npx wrangler deploy`

Format je Wochentag (0 = So … 6 = Sa): `[[öffnet, schließt]]` in Minuten seit Mitternacht,
`[]` = Ruhetag. Beispiel: `1: []` (Mo zu), `5: [[11*60, 23*60]]` (Fr 11–23).

---

## Vor dem echten Live-Betrieb

1. **Echte WinOrder-Artikelnummern** in `menu.js` (`art:`) statt der Platzhalter 1000+ eintragen.
2. **Zustellweg zu WinOrder** klären (Phase 3): laut WinOrder-Shop-Schnittstelle i. d. R.
   **E-Mail mit XML/JSON-Anhang** an ein Postfach, das WinOrder pollt (robust), alternativ REST-API.
   Postfach/Method vom Kunden holen → in `wrangler.toml` `WINORDER_EMAIL` setzen und die
   Zustellung im Webhook-Handler (`index.js`, Kommentar „Phase 3") ergänzen.
3. **Stripe Live-Modus:** `sk_live_…` als `STRIPE_SECRET_KEY`, neuen Live-Webhook + `whsec_…`.
4. Echte Öffnungszeiten eintragen (siehe oben).
5. Frontend live schalten (IONOS-Deploy-Workflow).
