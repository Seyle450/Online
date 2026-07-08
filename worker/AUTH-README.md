# Analytics-Login (Multi-Tenant) — Kurzanleitung

Kunden loggen sich mit eigenen Zugangsdaten ins Analytics-Dashboard ein und sehen
**nur die Daten ihrer eigenen Website**. Du (Master) siehst alle Sites und kannst
im Dashboard oben zwischen ihnen umschalten.

- **Passwörter**: nie im Klartext gespeichert – PBKDF2-HMAC-SHA256 (Salt + 100 000
  Iterationen; das ist das Maximum, das Cloudflare Workers in der Produktion
  erlaubt). Im Repo liegen nur Hashes.
- **Sessions**: zufällige, serverseitig widerrufbare Tokens in KV. Kein Passwort im
  Browser, nichts Sensibles im Token. TTL 12 h.
- **Trennung serverseitig erzwungen**: Ein Kunde kann per URL-Trick keine fremde
  Site sehen – der Worker filtert nach der zur Session gehörenden Site.
- **Brute-Force-Schutz**: `/login` ist auf 5 Versuche/Minute/IP begrenzt.
- **Fehlermeldung generisch**: „Zugangsdaten ungültig" (verrät nicht, ob User oder
  Passwort falsch war → kein User-Enumeration).

---

## 🔑 Neuen Kunden anlegen (3 Schritte)

1. **Passwort-Hash erzeugen** (im Ordner `worker/`):
   ```bash
   node hash-password.mjs
   ```
   Passwort eingeben → du bekommst einen `pbkdf2$…`-Hash. Das Klartext-Passwort
   verlässt nie deinen Rechner.

2. **`auth-config.js` bearbeiten**:
   - In `SITES` den Slug + Anzeigenamen ergänzen, z. B.
     ```js
     'gebaeudereinigung-xy': 'Gebäudereinigung XY',
     ```
   - In `USERS` den Zugang ergänzen:
     ```js
     { username: 'gebaeudereinigung-xy', hash: 'pbkdf2$…', role: 'user', site: 'gebaeudereinigung-xy' },
     ```
   - Der `site`-Slug muss zu dem passen, was der Tracker sendet
     (`getSiteKey()` in `../analytics/tracker.js`). Bei einer neuen Kundenseite
     dort ggf. eine Zeile ergänzen (oder der Server leitet den Slug automatisch
     aus dem Seitenpfad/Host ab – siehe `deriveSite()` in `auth.js`).

3. **Deployen**:
   ```bash
   cd worker
   npx wrangler deploy
   ```

Fertig. Dem Kunden `Benutzername` + `Passwort` mitteilen (Dashboard:
`https://elyesferchichi.com/analytics/`).

> **Master-Account** = Eintrag mit `role: 'master'` und `site: null`. Sieht alles.

---

## 🚀 Erst-Einrichtung (einmalig)

Diese Schritte laufen auf **deinem** Cloudflare-Konto – nur du kannst sie ausführen.

1. **Session-Secret setzen** (Pflicht – ohne dieses Secret kann sich niemand einloggen):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   cd worker
   npx wrangler secret put SESSION_SECRET      # den erzeugten Wert einfügen
   ```

2. **Datenbank migrieren** (fügt die `site`-Spalte hinzu, taggt Alt-Daten):
   ```bash
   npx wrangler d1 execute portfolio-analytics --remote --file=migrate-add-site.sql
   ```
   > Läuft die Migration versehentlich zweimal, meldet SQLite „duplicate column
   > name: site" – das ist harmlos.

3. **Worker deployen**:
   ```bash
   npx wrangler deploy
   ```

4. **Echte Passwörter setzen**: die beiden DEMO-Zugänge in `auth-config.js`
   (`elyes` / `pizza-blitz`) durch eigene ersetzen – Hash mit `hash-password.mjs`
   erzeugen, eintragen, erneut `npx wrangler deploy`.

Reihenfolge wichtig: **erst Worker deployen** (kennt das neue `site`-Feld), dann
die neue `tracker.js` live schalten (kommt beim normalen Website-Deploy automatisch
mit). Da der Tracker rückwärtskompatibel ist und der Worker fehlende Slugs selbst
ableitet, ist die Reihenfolge unkritisch, aber so am saubersten.

---

## 🧪 Lokal testen (ohne Live-System)

```bash
cd worker
# lokales Secret (wird nicht committet, steht in .gitignore)
node -e "console.log('SESSION_SECRET='+require('crypto').randomBytes(32).toString('base64'))" > .dev.vars
# lokale DB anlegen
npx wrangler d1 execute portfolio-analytics --local --file=schema.sql
# Dev-Server
npx wrangler dev --local
```
Dann z. B.:
```bash
curl -X POST http://127.0.0.1:8787/login -H "Content-Type: application/json" \
  -d '{"username":"elyes","password":"master-demo-123"}'
```

---

## 🗂️ Welche Datei macht was?

| Datei | Zweck |
|------|-------|
| `auth-config.js` | **Die einzige Datei zum Kunden-Anlegen** – SITES + USERS (nur Hashes) |
| `auth.js` | Auth-Kern: PBKDF2-Prüfung, KV-Sessions, Mandanten-Logik |
| `hash-password.mjs` | CLI: Klartext-Passwort → Hash |
| `index.js` | Worker – Routing, Endpunkte, serverseitige Site-Filterung |
| `schema.sql` | DB-Schema (Frischinstallation, inkl. `site`-Spalte) |
| `migrate-add-site.sql` | Einmalige Migration einer bestehenden DB |
| `wrangler.toml` | Bindings inkl. `LOGIN_LIMITER`; Secrets nur als Kommentar |

## Endpunkte

| Route | Auth | Zweck |
|------|------|-------|
| `POST /login` | – (Rate-Limit) | Login → Session-Token |
| `POST /logout` | Bearer-Token | Session widerrufen |
| `GET /me` | Bearer-Token | aktuelle Rolle/Site |
| `GET /summary`, `GET /data` | Bearer-Token | Auswertung, **nach Site gefiltert** |
| `GET /profiles`, `PUT /visitor/*` | Bearer-Token **Master** | Besucher-CRM (site-übergreifend) |

## Alt-Daten feiner aufteilen (optional)

`migrate-add-site.sql` ordnet alle Alt-Daten `elyesferchichi` zu. Willst du die
Historie einer bestimmten Seite nachträglich zuordnen, z. B. Pizza Blitz:
```bash
npx wrangler d1 execute portfolio-analytics --remote \
  --command="UPDATE events SET site='pizza-blitz' WHERE page LIKE '%pizza%blitz%'; UPDATE clicks SET site='pizza-blitz' WHERE page LIKE '%pizza%blitz%';"
```
