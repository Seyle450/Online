# Konzept-Seiten — Qualitäts-Checkliste

> Standard für Konzept-/Pitch-Websites. Elyes sagt „prüf die Seite gegen die Checkliste" → ich gehe das hier
> durch (headless-Render + Code-Check, nicht raten) und melde, was fehlt. Bei neuen Konventionen hier ergänzen.

## Geltungsbereich (Elyes 10.07.2026: „alle sind Konzepte außer Starscape und hochzeit")
- **FERTIG / NICHT anfassen:** `Portfolio/privat/hochzeit` ([[project-hochzeit]]). Nicht als Konzept behandeln, nicht „verbessern".
- **Starscape (Update Elyes 05.08.2026):** bekommt als einzige „fertige" Seite trotzdem die Kennzeichnung — aber als **Urheber-Hinweis auf Englisch** („Portfolio project", kein „Entwurf"), da echtes Projekt. Ansonsten weiterhin nicht als Konzept überarbeiten.
- **KONZEPTE (Checkliste gilt):** alle übrigen — `Portfolio/privat/` (bay, cafe-petit, coffee-corner, dilans, farfalla, habitat, kleiner-olymp, pizza blitz, traumclean) **und** `Portfolio/Webdesign-Agentur/` (antepli-baklava, bens, cafe-niki, hevis, lokma-lovers).
- **Auch Konzept** (Elyes bestätigt 10.07.): `grundschule-am-halmerweg` + alle `Webdesign-Agentur/`-Subdomains.
- **noindex-Politik (Empfehlung):** *fiktive* Demos ohne echten Betrieb (privat/ Café-Demos: bay, cafe-petit, …) → **noindex** (ranken nicht). *Pitches für echte Betriebe* (Subdomains antepli/bens/cafe-niki/hevis/lokma, grundschule) → **findbar lassen** (bewusst SEO'd = Lead-Köder: Inhaber findet seine Seite). **Alle** Konzepte bekommen aber das **Konzept-Popup** (markiert Urheber Elyes + Status). Vor Umstellung von Elyes bestätigen lassen.

## A · Konzept-Kennzeichnung (klar als Entwurf von Elyes erkennbar)
- [ ] **Konzept-Popup** nach ~15 s, einmal pro Sitzung (`sessionStorage`): „unverbindlicher Entwurf · Formular noch nicht aktiv · von Elyes Ferchichi" + Button zu elyesferchichi.com
      → **Stand 05.08.2026 auf allen 28 Seiten eingebaut.** Gemeinsames self-contained Snippet (`.elycn*` + `#elycnModal`, eigene CSS-Variablen je Marke) vor `</body>`; Ausnahmen: `pizza blitz/index.html` + `traumclean/index.html` nutzen ihre älteren `#conceptModal`-Varianten. Bei neuer Seite: Snippet aus einer bestehenden Seite kopieren und Farben/Fonts/`sessionStorage`-Key anpassen.
- [ ] **Footer-Backlink:** „Konzept & Umsetzung: Elyes Ferchichi · Webdesign Bremen"
- [ ] © … „**Konzept-Website**"
- [ ] `<meta name="robots" content="noindex, nofollow">` (Konzept soll nicht ranken)
- [ ] Konzept-Hinweis in Impressum + Datenschutz

## B · Rechtliches / DSGVO
- [ ] **Impressum** (§ 5 DDG): Inhaber, Anschrift, Telefon, E-Mail, USt-IdNr (oder Platzhalter markiert), Verantwortlicher (§ 18 MStV), Verbraucherstreitbeilegung, Haftung Inhalte/Links, Urheberrecht
- [ ] **Datenschutz:** Verantwortlicher, Rechte, Server-Logs, Reichweitenmessung + Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 TDDDG), Kontaktformular, Schriften lokal, Google Maps Zwei-Klick, Änderungsvorbehalt
- [ ] **Google Fonts NICHT extern** — self-hosted (sonst Abmahnrisiko)
- [ ] **Google Maps** nur als **Zwei-Klick** einbinden (lädt erst nach „Karte laden")
- [ ] Kontaktformular: **Datenschutz-Checkbox** + Link zur Datenschutzerklärung
- [ ] Schema.org: **keine erfundenen Bewertungen/Sterne** (Google-Richtlinie)

## C · Technik / Assets / Performance
- [ ] **Fonts self-hosted** (`fonts.css` + `assets/fonts/*.woff2`, `font-display:swap`)
- [ ] **Vendor-Scripts self-hosted** (kein CDN, z. B. gsap unter `assets/vendor/`)
- [ ] Bilder als **WebP**, komprimiert
- [ ] `loading="lazy"` für Bilder unter dem Fold
- [ ] `fetchpriority="high"` auf dem Hero-Bild (LCP)
- [ ] `width`/`height` bzw. `aspect-ratio` auf Bildern (gegen Layout-Shift/CLS)
- [ ] **Eigenes Icon für die Google-Suche:** Favicon, das neben dem Suchergebnis erscheint — **quadratisch, ≥ 48×48**, aus dem Logo, korrekt via `<link rel="icon">` referenziert & crawlbar. Dazu `apple-touch-icon` (180×180) fürs Homescreen-Symbol.
- [ ] **Link-Vorschau (beim Teilen in WhatsApp/Insta/Google):** OG-Bild **1200×630** + `og:title`/`og:description`/`og:url`/`og:image` + `twitter:card=summary_large_image`. Ergebnis: beim Senden des Links erscheinen **Bild + Titel + Beschreibung** (nicht nur die nackte URL).
- [ ] **Google-Seitenname** über dem Link stimmt (Firmenname, nicht „elyesferchichi.com"): `og:site_name` + WebSite-Schema.
- [ ] **Kein horizontaler Overflow** (mobil bei ~375–500 px geprüft)
- [ ] Keine CSS-/HTML-Leichen (doppelte Semikolons, tote Klassen)

### Analytics (Tracking)
- [ ] **Analytics-Tracker eingebunden:** `<script src="https://elyesferchichi.com/analytics/tracker.js" defer></script>` auf allen Seiten (index + Impressum + Datenschutz)
- [ ] **Seite in `getSiteKey()`** (`analytics/tracker.js`) registriert → Daten werden **korrekt der Seite zugeordnet** (eigener Eintrag im Dashboard, nicht „elyesferchichi")
- [ ] **Consent-Banner** erscheint (DSGVO) und Tracking läuft erst nach Einwilligung — so siehst du, ob der Kunde die Seite besucht hat
- [ ] (optional) relevante Buttons/CTAs als Events erfassbar (`data-track` bzw. `window.elyTrack`)

## D · Barrierefreiheit (A11y)
- [ ] **Skip-Link** („Zum Inhalt springen")
- [ ] Genau **ein `<h1>`**, saubere Überschriften-Hierarchie
- [ ] Sichtbarer **Fokus** (`:focus-visible`)
- [ ] Modals/Off-canvas: **`inert` + Scroll-Lock + Fokus-Management + Escape schließt**, Backdrop-Klick schließt
- [ ] **Touch-Targets ≥ 44 px** (Buttons, +/-, Close-X, Chips)
- [ ] **Inputs ≥ 16 px** (kein iOS-Auto-Zoom)
- [ ] **WCAG-Kontraste ≥ 4,5:1** (Text) — berechnet, nicht geschätzt
- [ ] `prefers-reduced-motion` respektiert
- [ ] `aria-label` auf Icon-Buttons, `alt` auf Bildern
- [ ] **Keine Emojis als Icons** → Inline-SVG

## E · SEO / Auffindbarkeit / Social
- [ ] Aussagekräftiger `<title>` + `meta description`
- [ ] `<link rel="canonical">`
- [ ] Open Graph + Twitter Card + `og:image`
- [ ] Schema.org passend (LocalBusiness / Restaurant / HomeAndConstructionBusiness …), echte Adresse/Geo (oder Platzhalter markiert)
- [ ] `<html lang="de">`

## F · Marke / Design / Inhalt
- [ ] Farben + Schriften **aus Logo/Brand** konsistent
- [ ] Logo im Header **und** Footer
- [ ] Klare Sektionen: Hero · Leistungen/Angebot · Über uns · Ablauf/Warum · Kontakt
- [ ] Klare **CTAs** (Anrufen / Angebot anfragen / Bestellen)
- [ ] Kontaktdaten überall korrekt & identisch (Telefon, E-Mail, Adresse)
- [ ] **Responsive** geprüft (Desktop + Tablet + Mobil, Screenshots)
- [ ] Animationen/Reveals dezent, nicht überladen

## G · Vor echtem Live-Gang (Konzept → echte Seite)
- [ ] `noindex` **entfernen**
- [ ] Echte Firmendaten/Impressum final (USt-IdNr, ggf. Rechtsform)
- [ ] **Echte Fotos** statt Platzhalter
- [ ] Inhalte/Preise vom Kunden **final bestätigt**
- [ ] Kontaktformular an **Postfach/Backend** anbinden (sendet aktuell nicht)
- [ ] **Kunden-Domain** verbinden (`canonical`, `og:url` anpassen)
- [ ] Schema: echte Daten, keine Fake-Ratings
- [ ] `og:url`/`canonical` auf die echte Kunden-Domain umgestellt
