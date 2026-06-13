# Analytics Setup – Vollständige Anleitung

Self-hosted Analytics für deine GitHub Pages Portfolio-Website.  
Kein Build-Step, kein Backend außer Cloudflare Workers (kostenloser Plan).

---

## Voraussetzungen

- GitHub Pages Website läuft bereits
- Node.js ≥ 18 installiert (für Wrangler CLI)
- Ein Cloudflare-Account (kostenlos)

---

## Schritt 1 – Cloudflare Account

1. Gehe zu [cloudflare.com](https://cloudflare.com) → **Sign Up** (kostenlos)
2. E-Mail bestätigen
3. Du brauchst **keine Domain** bei Cloudflare – nur den Account

---

## Schritt 2 – Wrangler CLI installieren

```bash
npm install -g wrangler
```

Einloggen:

```bash
wrangler login
```

Ein Browser-Fenster öffnet sich → Cloudflare-Account autorisieren.

---

## Schritt 3 – KV-Namespace anlegen

```bash
cd worker
wrangler kv:namespace create ANALYTICS
```

Die Ausgabe sieht so aus:

```
✅ Created namespace "ANALYTICS" with id "abc123xyz..."
```

**Kopiere die `id`** – du brauchst sie im nächsten Schritt.

Optionaler Preview-Namespace für lokale Entwicklung:

```bash
wrangler kv:namespace create ANALYTICS --preview
```

---

## Schritt 4 – wrangler.toml befüllen

Öffne `worker/wrangler.toml` und trage die ID ein:

```toml
[[kv_namespaces]]
binding = "ANALYTICS"
id     = "HIER_DEINE_ID_EINTRAGEN"   # ← von Schritt 3
```

Passe außerdem die CORS-Herkunft in `worker/index.js` an:

```js
// Zeile 7 in worker/index.js
const CORS_ORIGIN = 'https://DEIN-USERNAME.github.io';  // TODO: ersetzen
```

---

## Schritt 5 – Auth-Token setzen

Generiere ein sicheres Token (z.B. 32 zufällige Zeichen):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Setze es als Cloudflare Secret:

```bash
wrangler secret put AUTH_TOKEN
```

Eingabe: Dein generiertes Token → Enter.  
**Notiere dieses Token** – du brauchst es für das Dashboard.

---

## Schritt 6 – Worker deployen

```bash
wrangler deploy
```

Ausgabe zeigt deine Worker-URL:

```
✅ Deployed to: https://portfolio-analytics.DEIN-SUBDOMAIN.workers.dev
```

**Kopiere diese URL.**

---

## Schritt 7 – Worker-URL eintragen

In **beiden** Dateien die URL ersetzen:

### analytics/tracker.js (Zeile 9)
```js
var WORKER_URL = 'https://portfolio-analytics.DEIN-SUBDOMAIN.workers.dev';
```

### analytics/index.html (ca. Zeile 220)
```js
var WORKER_URL = 'https://portfolio-analytics.DEIN-SUBDOMAIN.workers.dev';
```

---

## Schritt 8 – Passwort-Hash für Dashboard generieren

Wähle ein Passwort für dein Dashboard. Generiere dann den SHA-256-Hash:

```bash
node -e "
const pw = 'DEIN-GEHEIMES-PASSWORT';
crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw))
  .then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
"
```

Ausgabe: ein langer Hex-String, z.B.:
```
a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3
```

---

## Schritt 9 – Hash in Dashboard eintragen

Öffne `analytics/index.html`, suche nach:

```js
var PASSWORD_HASH = 'TODO_SHA256_HASH_DEINES_PASSWORTS';
```

Ersetze den Platzhalter durch deinen Hash:

```js
var PASSWORD_HASH = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3';
```

Außerdem: Den API-Token (aus Schritt 5) legst du so ab, dass das Dashboard ihn ableiten kann.  
Das Dashboard leitet den API-Token automatisch aus dem eingegebenen Passwort ab – du musst ihn **nicht** im Code eintragen.

> **Wie das funktioniert:** Dashboard-Passwort → SHA-256 → verglichen mit `PASSWORD_HASH`  
> API-Token für Worker = SHA-256(Passwort + "_api")  
> Das Auth-Token des Workers muss diesem Wert entsprechen:

```bash
node -e "
const pw = 'DEIN-GEHEIMES-PASSWORT';
crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw + '_api'))
  .then(b => {
    const tok = [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
    console.log('Setze diesen Wert als AUTH_TOKEN im Worker:', tok);
  })
"
```

Den ausgegebenen Wert als Worker-Secret setzen:

```bash
wrangler secret put AUTH_TOKEN
# Eingabe: den Wert aus dem Node-Befehl oben
wrangler deploy  # neu deployen damit das Secret aktiv wird
```

---

## Schritt 10 – Tracking-Snippet in alle Seiten einfügen

Öffne jede HTML-Seite die du tracken möchtest und füge vor `</head>` ein:

```html
<script src="/analytics/tracker.js" defer></script>
```

Wenn deine Unterseite in einem Unterordner liegt (z.B. `/kunde-a/`), nutze den absoluten Pfad:

```html
<script src="/analytics/tracker.js" defer></script>
```

---

## Schritt 11 – Alles auf GitHub pushen

```bash
git add analytics/ worker/ ANALYTICS_SETUP.md
git commit -m "Add self-hosted analytics system"
git push
```

GitHub Pages deployt automatisch.

---

## Schritt 12 – Dashboard aufrufen

```
https://DEIN-USERNAME.github.io/analytics/
```

1. Seite öffnet Login-Dialog
2. Passwort eingeben (das aus Schritt 8)
3. Dashboard lädt Daten vom Worker

---

## Kostenrahmen (Cloudflare Free Plan)

| Resource | Free-Limit | Dein Verbrauch (Schätzung) |
|---|---|---|
| Worker Requests | 100.000 / Tag | 1 pro Seitenaufruf |
| KV Reads | 100.000 / Tag | ~5 pro Dashboard-Aufruf |
| KV Writes | 1.000 / Tag | 1 pro Seitenaufruf |
| KV Speicher | 1 GB | Sehr gering |

Für ein Portfolio-Website völlig ausreichend.

---

## Fehlerbehebung

### Dashboard zeigt "Fehler beim Laden"
- Worker-URL korrekt eingetragen?
- CORS-Origin in `worker/index.js` auf deine GitHub Pages URL gesetzt?
- AUTH_TOKEN korrekt gesetzt? → `wrangler secret list`

### Kein Tracking
- Script-Tag in den HTML-Seiten vorhanden?
- Worker läuft? → `https://DEIN-SUBDOMAIN.workers.dev/summary` im Browser aufrufen (gibt 401 zurück, das ist korrekt)

### KV-Namespace nicht gefunden
- ID in `wrangler.toml` korrekt?
- `wrangler deploy` nach Änderungen ausgeführt?

---

## Dateistruktur

```
worker/
  index.js          ← Cloudflare Worker (API)
  wrangler.toml     ← Cloudflare Konfiguration

analytics/
  index.html        ← Dashboard (Login + Charts)
  tracker.js        ← Tracking-Script (in alle Seiten einbinden)
  snippet.html      ← Einbindungs-Anleitung

ANALYTICS_SETUP.md  ← Diese Datei
```
