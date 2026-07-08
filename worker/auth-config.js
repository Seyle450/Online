/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  ZUGANGSDATEN & SITES – die einzige Datei, die du zum Anlegen eines      │
 * │  neuen Kunden bearbeiten musst.                                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * NEUEN KUNDEN ANLEGEN – 3 Schritte:
 *   1. Passwort-Hash erzeugen:   node hash-password.mjs
 *      (fragt nach dem Passwort, gibt den Hash aus – Klartext nie hier eintragen)
 *   2. Unten in SITES einen Eintrag  'slug': 'Anzeigename'  ergänzen.
 *   3. Unten in USERS einen Eintrag mit username, hash (aus Schritt 1),
 *      role: 'user' und site: '<slug aus Schritt 2>' ergänzen.
 *   → danach  wrangler deploy  (siehe AUTH-README.md).
 *
 * Es liegen hier NUR Hashes, niemals Klartext-Passwörter. Hashes sind
 * ungefährlich im Repo. Das Session-Secret liegt separat als Env-Variable
 * (wrangler secret put SESSION_SECRET) und NICHT in dieser Datei.
 *
 * role:
 *   'master' → sieht ALLE Sites, kann im Dashboard zwischen ihnen umschalten.
 *              site wird für Master ignoriert (auf null setzen).
 *   'user'   → sieht ausschließlich die Daten der zugewiesenen site.
 */

// slug → Anzeigename. Der slug muss exakt dem entsprechen, was der Tracker
// sendet (siehe getSiteKey() in ../analytics/tracker.js). 'elyesferchichi' ist
// die Hauptseite; die übrigen sind die bekannten Projekt-/Demo-Seiten.
export const SITES = {
  'elyesferchichi': 'Elyes Ferchichi (Hauptseite)',
  'pizza-blitz':    'Pizza Blitz Bremen',
  'antepli':        'Antepli',
  'hevis':          'Hevis',
  'bens':           "Ben's",
  'cafeniki':       'Café Niki',
  'lokma':          'Lokma',
  'starscape':      'Starscape',
  'freelance':      'Freelance',
};

// ⚠️ Die beiden Einträge unten sind DEMO-Zugänge zum lokalen Testen.
//    Vor dem echten Live-Betrieb: eigene Passwörter mit hash-password.mjs
//    erzeugen und die Hashes hier ersetzen (und Demo-User löschen/ändern).
export const USERS = [
  {
    // Master = du. Sieht alle Sites, mit Umschalter im Dashboard.
    username: 'elyes',
    hash:     'pbkdf2$100000$CiKOQJ6J/4qXcHnUp8lCYw==$gTx3eSTTrKhu6Y7imItjfvlm8mEEvttrPpY1xUhJP0Q=', // DEMO-Passwort: master-demo-123
    role:     'master',
    site:     null,
  },
  {
    // Beispiel-Kunde: sieht ausschließlich die Site 'pizza-blitz'.
    username: 'pizza-blitz',
    hash:     'pbkdf2$100000$F4ORsroolyYx17rowTCrrg==$NpZrmUyF4dIUfyCHCB18rmTz6JtuoEGXuJJYsKV4pG8=', // DEMO-Passwort: pizza-demo-123
    role:     'user',
    site:     'pizza-blitz',
  },
];
