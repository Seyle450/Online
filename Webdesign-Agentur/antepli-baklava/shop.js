/**
 * ANTEPLI — Bestellsystem (Frontend)
 * ──────────────────────────────────
 * Ein Skript für BEIDE Seiten:
 *   • index.html      → Section „Beliebte Produkte" (data-shop-popular)
 *   • bestellen.html  → volle Karte (data-shop-grid) + Kasse
 *
 * Warenkorb, Warenkorb-Button, Schublade, Größenwahl, Kasse und der
 * Bestätigungs-Screen werden von hier per JS eingehängt — die HTML-Seiten
 * brauchen nur einen Container mit data-shop-grid / data-shop-popular.
 *
 * Preise sind hier NUR für die Anzeige. Verbindlich rechnet der Worker
 * (order-api/menu.js) — Änderungen IMMER an beiden Stellen pflegen.
 */
(function () {
  'use strict';

  var ORDER_API = 'https://antepli-orders.seyle450.workers.dev';
  var CART_KEY = 'antepli_cart';
  var ORDER_KEY = 'antepli_last_order';

  // Solange die Seite ein Konzept ist: keine echte Zahlung vortäuschen. Die Kasse
  // sagt vorher UND nachher deutlich, dass nichts bestellt und nichts bezahlt wird.
  // Beim Live-Gang hier auf false setzen (zusammen mit dem .elycn-Popup entfernen).
  var KONZEPT_MODUS = true;

  /* ═══════════════ Konfiguration (Spiegel von order-api/menu.js) ═══════════ */

  var CONFIG = {
    minOrder: 15,
    freeFrom: 40,
    deliveryFee: 3.5,
    blechLeadDays: 1,
  };

  // Mo–Do 10:30–24:00 · Fr–So 10:30–01:00 (Werte > 1440 = über Mitternacht)
  var HOURS = {
    tz: 'Europe/Berlin',
    lastOrderMin: 15,
    days: {
      0: [[630, 1500]], 1: [[630, 1440]], 2: [[630, 1440]], 3: [[630, 1440]],
      4: [[630, 1440]], 5: [[630, 1500]], 6: [[630, 1500]],
    },
  };

  var SIZES = {
    gewicht: [
      { id: '250',  label: '250 g', mult: 2.5, info: 'ca. 8–10 Stück' },
      { id: '500',  label: '500 g', mult: 5,   info: 'ca. 16–20 Stück' },
      { id: '1000', label: '1 kg',  mult: 10,  info: 'ca. 32–40 Stück' },
    ],
    blech: [
      { id: 'viertel', label: '¼ Blech',      mult: 0.35, info: 'ca. 1 kg · für ca. 10 Gäste' },
      { id: 'halb',    label: '½ Blech',      mult: 0.6,  info: 'ca. 2 kg · für ca. 20 Gäste' },
      { id: 'ganz',    label: 'Ganzes Blech', mult: 1,    info: 'ca. 4 kg · für ca. 40 Gäste' },
    ],
  };

  var CATS = {
    baklava:   { name: 'Baklava & Co.',        note: 'Frisch gezogen, mit Antep-Pistazien' },
    warm:      { name: 'Warm & frisch serviert', note: 'Wird für dich zubereitet' },
    getraenke: { name: 'Dazu ein Çay',          note: 'Gehört einfach dazu' },
    blech:     { name: 'Ganze Bleche',          note: 'Für Feiern — mind. 1 Tag Vorlauf' },
  };

  // id → { name, price (Basispreis €), cat, sizes, desc, badge }
  var PRODUCTS = {
    'fistikli-baklava': { name: 'Fıstıklı Baklava', price: 3.5, cat: 'baklava', sizes: 'gewicht',
      desc: 'Klassische Baklava mit Antep-Pistazien und Butterteig.', badge: 'Beliebt', unit: '3,50 € / 100 g' },
    'sobiyet': { name: 'Şöbiyet', price: 3.8, cat: 'baklava', sizes: 'gewicht',
      desc: 'Gefüllt mit Sahnecreme und Pistazien.', unit: '3,80 € / 100 g' },
    'cevizli-baklava': { name: 'Cevizli Baklava', price: 3.2, cat: 'baklava', sizes: 'gewicht',
      desc: 'Mit Walnüssen, für Freunde des klassischen Geschmacks.', unit: '3,20 € / 100 g' },
    'soguk-baklava': { name: 'Soğuk Baklava', price: 4.5, cat: 'baklava', sizes: null,
      desc: 'Kalte Baklava mit Milch und Schokolade — erfrischend anders.', unit: 'pro Stück' },
    'havuc-dilimi': { name: 'Havuç Dilimi', price: 4.2, cat: 'baklava', sizes: null,
      desc: '„Karottenschnitte" — extra viele Pistazienschichten.', unit: 'pro Stück' },

    'fistikli-kunefe': { name: 'Fıstıklı Künefe', price: 9.5, cat: 'warm', sizes: null,
      desc: 'Engelshaar mit geschmolzenem Käse, Pistazien & Sirup.', badge: 'Hausspezialität' },
    'kunefe-maras': { name: 'Künefe mit Maraş-Eis', price: 11.5, cat: 'warm', sizes: null,
      desc: 'Heiß trifft kalt — unsere beliebteste Kombination.' },
    'katmer': { name: 'Katmer', price: 10.5, cat: 'warm', sizes: null,
      desc: 'Hauchdünner Teig mit Kaymak und Pistazien, frisch gebacken.' },
    'kadayif': { name: 'Kadayıf', price: 7.5, cat: 'warm', sizes: null,
      desc: 'Knuspriges Engelshaar mit Pistazienfüllung.' },

    'cay':   { name: 'Çay', price: 2, cat: 'getraenke', sizes: null, desc: 'Türkischer Schwarztee im Tulpenglas.' },
    'mokka': { name: 'Türkischer Mokka', price: 3.5, cat: 'getraenke', sizes: null, desc: 'Traditionell im Kupferkännchen gebrüht.' },

    'blech-fistikli': { name: 'Blech Fıstıklı Baklava', price: 55, cat: 'blech', sizes: 'blech',
      desc: 'Das Original mit Antep-Pistazien — der Klassiker für jede Feier.', badge: 'Beliebt',
      kurz: 'Fıstıklı Baklava', sub: 'Pistazie' },
    'blech-cevizli': { name: 'Blech Cevizli Baklava', price: 45, cat: 'blech', sizes: 'blech',
      desc: 'Mit Walnüssen, kräftiger im Geschmack.',
      kurz: 'Cevizli Baklava', sub: 'Walnuss' },
    'blech-sobiyet': { name: 'Blech Şöbiyet', price: 60, cat: 'blech', sizes: 'blech',
      desc: 'Mit Sahnecreme gefüllt — besonders zart.',
      kurz: 'Şöbiyet', sub: 'mit Sahnecreme' },
    'blech-havuc': { name: 'Blech Havuç Dilimi', price: 58, cat: 'blech', sizes: 'blech',
      desc: 'Karottenschnitte mit extra vielen Pistazienschichten.',
      kurz: 'Havuç Dilimi', sub: 'Karottenschnitte' },
  };

  /* ═══════════════════════════ Helfer ═════════════════════════════════════ */

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fmt = function (n) { return n.toFixed(2).replace('.', ',') + ' €'; };
  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };

  // Shop-Funnel an den seitenweiten Analytics-Tracker melden (nur falls aktiv/erlaubt).
  function shopEvent(type, label, value) {
    try { if (window.elyTrack) window.elyTrack(type, label, value != null ? { value: value } : undefined); } catch (e) {}
  }

  function sizeList(id) {
    var p = PRODUCTS[id];
    return p && p.sizes ? SIZES[p.sizes] : null;
  }
  function sizeById(group, sid) {
    var list = SIZES[group] || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === sid) return list[i];
    return null;
  }
  // Warenkorb-Key "id" oder "id|größe" → { id, name, price, cat, sizeLabel }
  function keyInfo(key) {
    var parts = String(key).split('|');
    var p = PRODUCTS[parts[0]];
    if (!p) return null;
    var price = p.price, sizeLabel = null;
    if (p.sizes) {
      var s = sizeById(p.sizes, parts[1]);
      if (!s) return null;
      price = Math.round(p.price * s.mult * 100) / 100;
      sizeLabel = s.label;
    } else if (parts[1]) return null;
    return { id: parts[0], name: p.name, price: price, cat: p.cat, sizeLabel: sizeLabel };
  }
  // Anzeigepreis auf der Karte: kleinste Größe = „ab X"
  function fromPrice(id) {
    var p = PRODUCTS[id], list = sizeList(id);
    if (!list) return { text: fmt(p.price), from: false };
    var min = Math.min.apply(null, list.map(function (s) { return p.price * s.mult; }));
    return { text: fmt(Math.round(min * 100) / 100), from: true };
  }

  /* ═════════════════════ Öffnungszeiten ═══════════════════════════════════ */

  function localNow(date) {
    var f = new Intl.DateTimeFormat('en-US', {
      timeZone: HOURS.tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
    });
    var p = {};
    f.formatToParts(date || new Date()).forEach(function (x) { p[x.type] = x.value; });
    var map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    var hh = parseInt(p.hour, 10); if (hh === 24) hh = 0;
    return { dow: map[p.weekday], minutes: hh * 60 + parseInt(p.minute, 10) };
  }
  function fmtMin(m) {
    m = m % 1440;
    var h = Math.floor(m / 60), mm = m % 60;
    return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
  }
  // { open, opensAt } — opensAt = nächste Öffnungszeit als Text, wenn geschlossen
  function shopStatus(date) {
    var now = localNow(date);
    var yest = (now.dow + 6) % 7;
    var hit = function (spans, m) {
      for (var i = 0; i < (spans || []).length; i++) {
        if (m >= spans[i][0] && m < spans[i][1] - HOURS.lastOrderMin) return true;
      }
      return false;
    };
    if (hit(HOURS.days[now.dow], now.minutes) || hit(HOURS.days[yest], now.minutes + 1440)) {
      return { open: true };
    }
    // nächste Öffnung suchen (heute später oder an einem der nächsten 7 Tage)
    var todaySpans = HOURS.days[now.dow] || [];
    for (var i = 0; i < todaySpans.length; i++) {
      if (now.minutes < todaySpans[i][0]) return { open: false, opensAt: 'heute ab ' + fmtMin(todaySpans[i][0]) };
    }
    var names = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    for (var d = 1; d <= 7; d++) {
      var dow = (now.dow + d) % 7, spans = HOURS.days[dow] || [];
      if (spans.length) {
        return { open: false, opensAt: (d === 1 ? 'morgen' : names[dow]) + ' ab ' + fmtMin(spans[0][0]) };
      }
    }
    return { open: false, opensAt: '' };
  }
  function closedMsg(st) {
    return 'Wir haben gerade geschlossen' + (st.opensAt ? ' — wieder ' + st.opensAt + '.' : '.');
  }

  // 'YYYY-MM-DD' von heute + n Tagen (Bremer Zeit)
  function localDateISO(offsetDays) {
    var s = new Intl.DateTimeFormat('en-CA', {
      timeZone: HOURS.tz, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
    if (!offsetDays) return s;
    var d = new Date(s + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  }
  function deDate(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    return p[2] + '.' + p[1] + '.' + p[0];
  }

  /* ═══════════════════════ Warenkorb-Zustand ══════════════════════════════ */

  var cart = {}, mode = 'abholung';
  try {
    var stored = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
    if (stored && typeof stored === 'object') {
      // verwaiste Keys (Artikel existiert nicht mehr) still entfernen
      for (var k in stored) if (keyInfo(k)) cart[k] = stored[k];
    }
    var m = localStorage.getItem(CART_KEY + '_mode');
    if (m === 'lieferung' || m === 'abholung') mode = m;
  } catch (e) {}

  function saveCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      localStorage.setItem(CART_KEY + '_mode', mode);
    } catch (e) {}
  }
  function cartCount() { var n = 0; for (var k in cart) n += cart[k]; return n; }
  function subtotal() {
    var s = 0;
    for (var k in cart) { var i = keyInfo(k); if (i) s += i.price * cart[k]; }
    return Math.round(s * 100) / 100;
  }
  function cartHasBlech() {
    for (var k in cart) { var i = keyInfo(k); if (i && i.cat === 'blech') return true; }
    return false;
  }
  function totals() {
    var sub = subtotal(), isLief = mode === 'lieferung';
    var delivery = isLief ? (sub >= CONFIG.freeFrom ? 0 : CONFIG.deliveryFee) : 0;
    return { sub: sub, isLief: isLief, delivery: delivery, total: Math.round((sub + delivery) * 100) / 100 };
  }

  /* ═════════════════════ UI einhängen (einmalig) ══════════════════════════ */

  function mountUI() {
    var el = document.createElement('div');
    el.className = 'shop-ui';
    el.innerHTML = [
      '<div class="shop-scrim" id="shScrim" hidden></div>',

      '<button class="cart-fab" id="cartFab" type="button" hidden aria-label="Warenkorb öffnen">',
        '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6h15l-1.5 9h-12L6 6Zm0 0L5 3H2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="20" r="1.6" fill="currentColor"/><circle cx="18" cy="20" r="1.6" fill="currentColor"/></svg>',
        '<span class="cart-count" id="cartCount">0</span>',
      '</button>',

      '<aside class="cart-drawer" id="cartDrawer" aria-hidden="true" aria-label="Warenkorb">',
        '<div class="cart-head"><h3>Dein Warenkorb</h3><button class="cart-close" id="cartClose" type="button" aria-label="Schließen">×</button></div>',
        '<div class="cart-items" id="cartItems"></div>',
        '<p class="cart-empty-msg" id="cartEmptyMsg">Noch nichts drin — stöbere in der Karte.</p>',
        '<div class="cart-summary" id="cartSummary" hidden>',
          '<div class="mode-toggle" role="group" aria-label="Abholung oder Lieferung">',
            '<button class="mode-btn" type="button" data-mode="abholung">Abholung</button>',
            '<button class="mode-btn" type="button" data-mode="lieferung">Lieferung</button>',
          '</div>',
          '<div class="sum-row"><span>Zwischensumme</span><span id="sumSubtotal">0,00 €</span></div>',
          '<div class="sum-row"><span id="sumDelLabel">Lieferung</span><span id="sumDelivery">–</span></div>',
          '<div class="sum-row sum-total"><span>Gesamt</span><span id="sumTotal">0,00 €</span></div>',
          '<p class="cart-note" id="minNote" hidden></p>',
          '<p class="cart-note" id="blechNote" hidden></p>',
          '<p class="cart-note is-warn" id="closedNote" hidden></p>',
          '<button class="btn btn-block" type="button" id="checkoutBtn">Zur Kasse</button>',
          '<a class="cart-more" id="cartMore" href="bestellen.html">Ganze Karte ansehen →</a>',
        '</div>',
      '</aside>',

      // ── Größenwahl ──
      '<div class="shop-backdrop" id="sizeBackdrop" hidden></div>',
      '<div class="shop-modal size-modal" id="sizeModal" role="dialog" aria-modal="true" aria-labelledby="sizeTitle" aria-hidden="true">',
        '<button class="shop-close" id="sizeClose" type="button" aria-label="Schließen">×</button>',
        '<span class="shop-eyebrow">Menge wählen</span>',
        '<h3 id="sizeTitle">Größe</h3>',
        '<p class="size-item" id="sizeItemName"></p>',
        '<div class="size-options" id="sizeOptions"></div>',
      '</div>',

      // ── Kasse ──
      '<div class="shop-backdrop" id="checkoutBackdrop" hidden></div>',
      '<div class="shop-modal checkout-modal" id="checkoutModal" role="dialog" aria-modal="true" aria-labelledby="checkoutTitle" aria-hidden="true">',
        '<button class="shop-close" id="checkoutClose" type="button" aria-label="Schließen">×</button>',
        '<span class="shop-eyebrow" id="coMode">Abholung</span>',
        '<h3 id="checkoutTitle">Bestellung abschließen</h3>',
        (KONZEPT_MODUS
          ? '<p class="co-konzept"><strong>Konzept-Website:</strong> Diese Seite ist ein Gestaltungsentwurf. '
            + 'Es wird <strong>nichts bezahlt und nichts geliefert</strong> — deine Eingabe geht nur als '
            + 'Testbestellung an den Ersteller der Seite.</p>'
          : ''),
        '<form id="checkoutForm" novalidate>',
          '<div class="co-row">',
            '<label>Name<input type="text" name="name" autocomplete="name" required></label>',
            '<label>Telefon<input type="tel" name="phone" autocomplete="tel" required></label>',
          '</div>',
          '<label>E-Mail <span class="co-opt">(für die Bestätigung)</span><input type="email" name="email" autocomplete="email"></label>',
          '<div class="co-delivery" id="coDelivery">',
            '<label>Straße &amp; Hausnummer<input type="text" name="street" autocomplete="street-address"></label>',
            '<div class="co-row">',
              '<label>PLZ<input type="text" name="zip" inputmode="numeric" autocomplete="postal-code"></label>',
              '<label>Ort<input type="text" name="city" value="Bremen" autocomplete="address-level2"></label>',
            '</div>',
          '</div>',
          '<div class="co-pickup" id="coPickup">',
            '<p class="co-hint" id="coPickupHint"></p>',
            '<div class="co-row">',
              '<label id="coDateLabel">Wunschdatum<input type="date" name="pdate"></label>',
              '<label>Uhrzeit <span class="co-opt">(optional)</span><input type="time" name="ptime"></label>',
            '</div>',
          '</div>',
          '<label>Anmerkung <span class="co-opt">(optional)</span><textarea name="note" rows="2" placeholder="z. B. Schrift auf dem Blech, Allergien, Klingel …"></textarea></label>',
          '<div class="co-summary">',
            '<div class="sum-row"><span>Zwischensumme</span><span id="coSub">0,00 €</span></div>',
            '<div class="sum-row"><span id="coDelLabel">Lieferung</span><span id="coDel">–</span></div>',
            '<div class="sum-row sum-total"><span>Gesamt</span><span id="coTotal">0,00 €</span></div>',
          '</div>',
          '<p class="co-error" id="coError" hidden></p>',
          '<button type="submit" class="btn btn-block" id="coPayBtn">Jetzt bezahlen</button>',
          '<p class="co-secure"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 1 1 6 0v3H9z" fill="currentColor"/></svg> '
          + (KONZEPT_MODUS
              ? 'Keine Zahlung — im Echtbetrieb liefe die Kasse über Stripe'
              : 'Sichere Zahlung über Stripe · Karte, Apple&nbsp;Pay &amp; Google&nbsp;Pay') + '</p>',
          '<p class="co-legal">Mit dem Absenden werden deine Angaben zur Bearbeitung der Bestellung verarbeitet — Details in der <a href="datenschutz.html">Datenschutzerklärung</a>.</p>',
        '</form>',
      '</div>',

      // ── Bestätigung nach der Zahlung ──
      '<div class="shop-backdrop" id="confirmBackdrop" hidden></div>',
      '<div class="shop-modal confirm-modal" id="confirmModal" role="dialog" aria-modal="true" aria-labelledby="confirmTitle" aria-hidden="true">',
        '<div class="confirm-orn" aria-hidden="true">◆</div>',
        '<h3 id="confirmTitle">Teşekkürler!</h3>',
        '<p class="confirm-sub" id="confirmSub">Deine Zahlung ist eingegangen — wir bereiten alles frisch für dich zu.</p>',
        '<ul class="confirm-items" id="confirmItems" hidden></ul>',
        '<div class="confirm-details">',
          '<div class="cd-row" id="confirmOidRow"><span>Bestellnummer</span><strong id="confirmOid">—</strong></div>',
          '<div class="cd-row"><span id="confirmModeLabel">Bestellung</span><strong id="confirmTotal">—</strong></div>',
          '<div class="cd-row" id="confirmPickupRow" hidden><span>Termin</span><strong id="confirmPickup">—</strong></div>',
          '<div class="cd-row"><span>Status</span><strong id="confirmStatus" class="cd-status">bezahlt</strong></div>',
        '</div>',
        '<p class="confirm-note" id="confirmNote">Notier dir deine Bestellnummer — bei Rückfragen einfach angeben.</p>',
        '<button class="btn btn-block" type="button" id="confirmClose">Alles klar</button>',
      '</div>',

      '<div class="shop-toast" id="shopToast" role="status" aria-live="polite" hidden></div>',
    ].join('');
    document.body.appendChild(el);
  }

  /* ══════════════════════ Dialog-Grundlagen ═══════════════════════════════ */

  var lastFocus = null;
  function setDialog(sel, open) {
    var el = $(sel);
    if (!el) return;
    el.setAttribute('aria-hidden', open ? 'false' : 'true');
    try { el.inert = !open; } catch (e) {}
    el.classList.toggle('is-on', open);
    updateScrollLock();
  }
  function anyOpen() {
    return !!$('.shop-modal.is-on') || document.body.classList.contains('cart-open');
  }
  function updateScrollLock() {
    document.body.classList.toggle('shop-locked', anyOpen());
  }
  function openModal(sel, backdropSel) {
    lastFocus = document.activeElement;
    if (backdropSel) $(backdropSel).hidden = false;
    setDialog(sel, true);
    var f = $(sel).querySelector('input, button:not(.shop-close), [tabindex]');
    if (f) { try { f.focus(); } catch (e) {} }
  }
  function closeModal(sel, backdropSel) {
    if (backdropSel) $(backdropSel).hidden = true;
    setDialog(sel, false);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
    lastFocus = null;
  }

  var toastTimer = null;
  function toast(msg) {
    var t = $('#shopToast');
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    requestAnimationFrame(function () { t.classList.add('is-on'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove('is-on');
      setTimeout(function () { t.hidden = true; }, 300);
    }, 2200);
  }

  /* ═══════════════════ Produktkarten rendern ══════════════════════════════ */

  // Produktbild: assets/produkte/<id>.png (freigestellt, transparent).
  //
  // Startzustand ist bewusst `is-leer` (kompaktes Rauten-Ornament) und erst ein
  // erfolgreiches onload klappt die Bildfläche auf. Andersherum — Bildfläche
  // zuerst, onerror räumt auf — bleiben bei fehlenden Dateien unterschiedlich
  // hohe Karten stehen, weil onerror je nach Sichtbarkeit zu verschiedenen
  // Zeiten feuert. Aus demselben Grund KEIN loading="lazy": sonst wächst eine
  // Karte erst beim Heranscrollen und schiebt das Raster.
  function bildHTML(id, name) {
    // Zuerst das optimierte WebP (tools/optimiere-bilder.cjs), sonst das PNG.
    // So funktioniert auch ein frisch abgelegtes PNG sofort, ohne dass das
    // Optimier-Skript gelaufen sein muss; erst danach fällt es aufs Ornament.
    var basis = 'assets/produkte/' + id;
    return '<div class="pcard-media is-leer">'
      + '<img src="' + basis + '.webp" alt="' + esc(name) + '" decoding="async"'
      + ' onload="this.closest(\'.pcard-media\').classList.remove(\'is-leer\');"'
      + ' onerror="if(this.dataset.alt){this.remove();}else{this.dataset.alt=1;this.src=\'' + basis + '.png\';}">'
      + '<span class="pcard-orn" aria-hidden="true"><i></i><i></i><i></i></span>'
      + '</div>';
  }

  function cardHTML(id) {
    var p = PRODUCTS[id];
    if (!p) return '';
    var price = fromPrice(id);
    var meta = p.sizes ? (p.unit || 'Größe wählen') : (p.unit || 'pro Portion');
    return '<article class="pcard" data-product="' + id + '">'
      + bildHTML(id, p.name)
      + '<div class="pcard-body">'
      + '<h3 class="pcard-name">' + esc(p.name) + (p.badge ? '<span class="pcard-badge">' + esc(p.badge) + '</span>' : '') + '</h3>'
      + (p.desc ? '<p class="pcard-desc">' + esc(p.desc) + '</p>' : '')
      + '</div>'
      + '<div class="pcard-foot">'
      + '<span class="pcard-price">' + (price.from ? '<small>ab</small> ' : '') + price.text
      + '<small class="pcard-unit">' + esc(meta) + '</small></span>'
      + '<button class="pcard-add" type="button" data-add="' + id + '" aria-label="' + esc(p.name) + ' in den Warenkorb">'
      + (p.sizes ? 'Wählen' : '+ Korb') + '</button>'
      + '</div></article>';
  }

  function renderGrids() {
    // <div data-shop-popular="id,id,id">  → genau diese Artikel
    $$('[data-shop-popular]').forEach(function (host) {
      var ids = host.getAttribute('data-shop-popular').split(',')
        .map(function (s) { return s.trim(); }).filter(function (s) { return PRODUCTS[s]; });
      host.innerHTML = '<div class="pgrid">' + ids.map(cardHTML).join('') + '</div>';
    });

    // <div data-shop-grid="baklava,warm,…"> → ganze Kategorien mit Überschrift
    $$('[data-shop-grid]').forEach(function (host) {
      var cats = host.getAttribute('data-shop-grid').split(',')
        .map(function (s) { return s.trim(); }).filter(function (s) { return CATS[s]; });
      host.innerHTML = cats.map(function (cat) {
        var ids = Object.keys(PRODUCTS).filter(function (id) { return PRODUCTS[id].cat === cat; });
        return '<section class="pcat" id="cat-' + cat + '">'
          + '<div class="pcat-head"><h2>' + esc(CATS[cat].name) + '</h2>'
          + '<span>' + esc(CATS[cat].note) + '</span></div>'
          + '<div class="pgrid">' + ids.map(cardHTML).join('') + '</div></section>';
      }).join('');
    });
  }

  /* ══════════════ Blech-Konfigurator (Startseite, <div data-shop-blech>) ═══ */
  // Sorte + Größe + Anzahl in einem Zug in den Warenkorb. Preise kommen aus
  // PRODUCTS/SIZES — dieselbe Quelle wie die Karten, damit nichts auseinanderläuft.
  // Der Abholtermin wird nicht hier, sondern an der Kasse abgefragt (Pflicht bei Blechen).

  // id bewusst leer: der Besucher soll die Sorte aktiv wählen, nicht eine
  // vorausgewählte bestätigen. Erst danach zeigt die Section das Produktbild
  // und der Warenkorb-Button wird aktiv.
  var blechState = { id: null, size: 'halb', qty: 1 };
  var BLECH_STANDARDBILD = 'assets/bleche.webp';

  function blechIds() {
    return Object.keys(PRODUCTS).filter(function (id) { return PRODUCTS[id].cat === 'blech'; });
  }
  function renderBlechConfig() {
    var host = $('[data-shop-blech]');
    if (!host) return;
    var qtyOpts = '';
    for (var i = 1; i <= 5; i++) qtyOpts += '<option value="' + i + '">' + i + '</option>';

    host.innerHTML = [
      '<div class="field">',
        '<label id="blechSorteLabel">Sorte</label>',
        '<div class="seg" role="group" aria-labelledby="blechSorteLabel">',
          blechIds().map(function (id) {
            var p = PRODUCTS[id];
            return '<button type="button" data-blech-sorte="' + id + '" aria-pressed="false">'
              + esc(p.kurz || p.name) + '<small>' + esc(p.sub || '') + '</small></button>';
          }).join(''),
        '</div>',
      '</div>',
      '<div class="field">',
        '<label id="blechGroesseLabel">Größe</label>',
        '<div class="seg" role="group" aria-labelledby="blechGroesseLabel">',
          SIZES.blech.map(function (s) {
            return '<button type="button" data-blech-groesse="' + s.id + '" aria-pressed="false">'
              + esc(s.label) + '<small>' + esc(s.info.split(' · ')[0]) + '</small></button>';
          }).join(''),
        '</div>',
      '</div>',
      '<div class="field-row">',
        '<div class="field">',
          '<label for="blechAnzahl">Anzahl Bleche</label>',
          '<select id="blechAnzahl">' + qtyOpts + '</select>',
        '</div>',
        '<div class="field blech-info">',
          '<label>Abholtermin</label>',
          '<p id="blechTermin">Wählst du an der Kasse — frühestens morgen.</p>',
        '</div>',
      '</div>',
      '<div class="order-summary">',
        '<div class="total"><small id="blechPick">Auswahl</small><span id="blechTotal">0,00 €</span></div>',
        '<button class="btn" type="button" id="blechAdd">In den Warenkorb</button>',
      '</div>',
      '<p class="blech-hint">Ganze Bleche backen wir frisch — bitte mindestens einen Tag vorher bestellen. Bezahlt wird online, abgeholt am Waller Ring.</p>',
    ].join('');

    paintBlech();
  }

  // Zeigt in der Blech-Section das Bild der gewählten Sorte. Der Bildbereich
  // ist ein <image-slot>; dessen src-Attribut ist als Fallback gedacht und
  // wird bei Änderung neu gerendert — ein vom Nutzer abgelegtes Foto bleibt
  // dabei vorrangig, deshalb greifen wir nur auf src zu.
  function paintBlechBild() {
    var slot = document.getElementById('blech-foto');
    if (!slot) return;
    var neu = blechState.id ? 'assets/produkte/' + blechState.id + '.webp' : BLECH_STANDARDBILD;
    if (slot.getAttribute('src') === neu) return;
    slot.setAttribute('src', neu);
    // Freisteller brauchen Luft, das Stimmungsfoto darf die Fläche füllen
    slot.setAttribute('fit', blechState.id ? 'contain' : 'cover');
    var p = blechState.id && PRODUCTS[blechState.id];
    slot.setAttribute('aria-label', p ? p.name + ' — frisch gebackenes Blech'
      : 'Mehrere ganze Bleche Baklava frisch aus dem Ofen');
  }

  function paintBlech() {
    if (!$('[data-shop-blech]')) return;
    $$('[data-blech-sorte]').forEach(function (b) {
      var on = b.getAttribute('data-blech-sorte') === blechState.id;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    $$('[data-blech-groesse]').forEach(function (b) {
      var on = b.getAttribute('data-blech-groesse') === blechState.size;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    paintBlechBild();
    $('#blechTermin').textContent = 'Wählst du an der Kasse — frühestens ' + deDate(localDateISO(CONFIG.blechLeadDays)) + '.';

    var btn = $('#blechAdd');
    var info = blechState.id && keyInfo(blechState.id + '|' + blechState.size);
    if (!info) {
      $('#blechTotal').textContent = '—';
      $('#blechPick').textContent = 'Bitte Sorte wählen';
      btn.disabled = true;
      btn.textContent = 'Sorte wählen';
      return;
    }
    $('#blechTotal').textContent = fmt(info.price * blechState.qty);
    $('#blechPick').textContent = (PRODUCTS[blechState.id].kurz || info.name) + ' · ' + info.sizeLabel
      + (blechState.qty > 1 ? ' · ' + blechState.qty + 'x' : '');
    btn.disabled = false;
    btn.textContent = 'In den Warenkorb';
  }

  function addBlech() {
    if (!blechState.id) return;
    var key = blechState.id + '|' + blechState.size;
    for (var i = 0; i < blechState.qty; i++) addKey(key, i < blechState.qty - 1);
    openCart();
  }

  /* ═════════════════════════ Warenkorb-Aktionen ═══════════════════════════ */

  function addKey(key, silent) {
    var info = keyInfo(key);
    if (!info) return;
    cart[key] = (cart[key] || 0) + 1;
    shopEvent('add_to_cart', info.name + (info.sizeLabel ? ' · ' + info.sizeLabel : ''), info.price);
    renderCart();
    bumpFab();
    if (!silent) toast(info.name + (info.sizeLabel ? ' · ' + info.sizeLabel : '') + ' hinzugefügt');
  }
  function addToCart(id) {
    if (sizeList(id)) openSizeModal(id);
    else addKey(id);
  }
  function changeQty(key, d) {
    cart[key] = (cart[key] || 0) + d;
    if (cart[key] <= 0) delete cart[key];
    renderCart();
  }
  function bumpFab() {
    var fab = $('#cartFab');
    if (!fab) return;
    fab.classList.remove('bump');
    void fab.offsetWidth;
    fab.classList.add('bump');
  }

  /* ── Größenwahl ── */
  var pendingSizeId = null;
  function openSizeModal(id) {
    var p = PRODUCTS[id], list = sizeList(id);
    if (!p || !list) return;
    pendingSizeId = id;
    $('#sizeTitle').textContent = p.name;
    $('#sizeItemName').textContent = p.desc || '';
    $('#sizeOptions').innerHTML = list.map(function (s) {
      var price = Math.round(p.price * s.mult * 100) / 100;
      return '<button class="size-opt" type="button" data-size="' + s.id + '">'
        + '<span class="so-label">' + esc(s.label) + '<small>' + esc(s.info) + '</small></span>'
        + '<span class="so-price">' + fmt(price) + '</span></button>';
    }).join('');
    openModal('#sizeModal', '#sizeBackdrop');
  }
  function closeSizeModal() {
    pendingSizeId = null;
    closeModal('#sizeModal', '#sizeBackdrop');
  }

  /* ── Schublade ── */
  function openCart() {
    document.body.classList.add('cart-open');
    $('#shScrim').hidden = false;
    setDialog('#cartDrawer', true);
  }
  function closeCart() {
    document.body.classList.remove('cart-open');
    $('#shScrim').hidden = true;
    setDialog('#cartDrawer', false);
  }

  function renderCart() {
    saveCart();
    var count = cartCount();
    $('#cartCount').textContent = count;
    $('#cartFab').hidden = count === 0;

    $('#cartItems').innerHTML = Object.keys(cart).map(function (key) {
      var info = keyInfo(key), q = cart[key];
      if (!info) return '';
      return '<div class="ci-row">'
        + '<div class="ci-info"><div class="ci-name">' + esc(info.name)
        + (info.sizeLabel ? ' <span class="ci-size">' + esc(info.sizeLabel) + '</span>' : '') + '</div>'
        + '<div class="ci-price">' + fmt(info.price) + ' · <strong>' + fmt(info.price * q) + '</strong></div></div>'
        + '<div class="ci-qty"><button type="button" data-dec="' + esc(key) + '" aria-label="weniger">−</button>'
        + '<span>' + q + '</span>'
        + '<button type="button" data-inc="' + esc(key) + '" aria-label="mehr">+</button></div></div>';
    }).join('');

    $('#cartEmptyMsg').hidden = count > 0;
    $('#cartSummary').hidden = count === 0;

    $$('.mode-btn').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-mode') === mode);
    });

    var t = totals();
    var belowMin = t.isLief && t.sub > 0 && t.sub < CONFIG.minOrder;
    $('#sumSubtotal').textContent = fmt(t.sub);
    $('#sumDelLabel').textContent = t.isLief ? 'Lieferung' : 'Abholung';
    $('#sumDelivery').textContent = t.isLief ? (t.delivery === 0 ? 'kostenlos' : fmt(t.delivery)) : 'im Laden';
    $('#sumTotal').textContent = fmt(t.total);

    var minNote = $('#minNote');
    minNote.hidden = !belowMin;
    if (belowMin) {
      minNote.textContent = 'Mindestbestellwert für Lieferung: ' + fmt(CONFIG.minOrder)
        + ' (es fehlen ' + fmt(CONFIG.minOrder - t.sub) + ')';
    }

    var blechNote = $('#blechNote');
    blechNote.hidden = !cartHasBlech();
    if (!blechNote.hidden) {
      blechNote.textContent = 'Ganze Bleche backen wir frisch — bitte im nächsten Schritt einen Termin ab '
        + deDate(localDateISO(CONFIG.blechLeadDays)) + ' wählen.';
    }

    var st = shopStatus();
    $('#closedNote').hidden = st.open;
    if (!st.open) $('#closedNote').textContent = closedMsg(st);

    var btn = $('#checkoutBtn');
    btn.disabled = belowMin || count === 0 || !st.open;
    btn.textContent = st.open ? 'Zur Kasse · ' + fmt(t.total) : 'Geschlossen';

    // „Ganze Karte ansehen" nur auf der Landing Page zeigen
    var more = $('#cartMore');
    if (more) more.hidden = !!$('[data-shop-grid]');
  }

  /* ═══════════════════════════ Kasse ══════════════════════════════════════ */

  function openCheckout() {
    var st = shopStatus();
    if (!st.open) { renderCart(); openCart(); return; }
    var t = totals();
    shopEvent('checkout_start', (t.isLief ? 'Lieferung' : 'Abholung') + ' · ' + cartCount() + ' Artikel', t.total);

    $('#coMode').textContent = t.isLief ? 'Lieferung' : 'Abholung';
    $('#coDelivery').hidden = !t.isLief;
    $('#coDelLabel').textContent = t.isLief ? 'Lieferung' : 'Abholung';
    $('#coSub').textContent = fmt(t.sub);
    $('#coDel').textContent = t.isLief ? (t.delivery === 0 ? 'kostenlos' : fmt(t.delivery)) : 'im Laden';
    $('#coTotal').textContent = fmt(t.total);
    $('#coPayBtn').textContent = (KONZEPT_MODUS ? 'Testbestellung absenden · ' : 'Jetzt bezahlen · ') + fmt(t.total);
    $('#coError').hidden = true;

    // Terminfeld: bei Blechen Pflicht (mit Vorlauf), sonst optional
    var blech = cartHasBlech();
    var dateInput = $('#checkoutForm').elements['pdate'];
    var min = blech ? localDateISO(CONFIG.blechLeadDays) : localDateISO(0);
    dateInput.min = min;
    dateInput.max = localDateISO(60);
    dateInput.required = blech;
    if (blech && (!dateInput.value || dateInput.value < min)) dateInput.value = min;
    $('#coDateLabel').childNodes[0].nodeValue = blech ? 'Wunschtermin' : 'Wunschtermin ';
    $('#coPickupHint').textContent = blech
      ? 'Ganze Bleche werden frisch gebacken — frühester Termin: ' + deDate(min) + '.'
      : (t.isLief ? 'Wann sollen wir liefern? Ohne Angabe kommen wir so schnell wie möglich.'
                  : 'Wann holst du ab? Ohne Angabe machen wir alles sofort fertig.');

    openModal('#checkoutModal', '#checkoutBackdrop');
  }
  function closeCheckout() { closeModal('#checkoutModal', '#checkoutBackdrop'); }
  function coError(msg) { var e = $('#coError'); e.textContent = msg; e.hidden = false; }

  function submitCheckout(e) {
    e.preventDefault();
    var el = e.target.elements;
    var name = el['name'].value.trim(), phone = el['phone'].value.trim();
    var isLief = mode === 'lieferung';

    if (!name || !phone) return coError('Bitte Name und Telefon angeben.');
    if (isLief && (!el['street'].value.trim() || !el['zip'].value.trim())) {
      return coError('Bitte Straße und PLZ angeben.');
    }
    if (cartCount() === 0) return coError('Dein Warenkorb ist leer.');
    if (cartHasBlech() && !el['pdate'].value) {
      return coError('Für ganze Bleche brauchen wir einen Wunschtermin.');
    }

    var payload = {
      items: cart,
      mode: mode,
      customer: { name: name, phone: phone, email: el['email'].value.trim() },
      note: el['note'].value.trim(),
    };
    if (isLief) {
      payload.address = {
        street: el['street'].value.trim(),
        zip: el['zip'].value.trim(),
        city: el['city'].value.trim() || 'Bremen',
      };
    }
    if (el['pdate'].value) payload.pickup = { date: el['pdate'].value, time: el['ptime'].value || '' };

    var btn = $('#coPayBtn'), prev = btn.textContent;
    var art = isLief ? 'Lieferung' : 'Abholung';
    var summe = totals().total;
    btn.disabled = true;
    btn.textContent = KONZEPT_MODUS ? 'Wird gesendet …' : 'Weiterleitung …';
    $('#coError').hidden = true;

    // Die Absicht wird IMMER an Analytics gemeldet — auch wenn das Backend gerade
    // nicht erreichbar ist. Sonst wäre genau die interessante Zahl (wie viele
    // Besucher wirklich bestellen wollten) nicht sichtbar.
    shopEvent('order_submit', art + ' · ' + cartCount() + ' Artikel', summe);

    fetch(ORDER_API + '/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; });
    }).then(function (res) {
      // Konzept-Modus: der Worker hat gemeldet statt zu kassieren
      if (res.ok && res.d.demo) {
        shopEvent('demo_order', art + (res.d.orderId ? ' · ' + res.d.orderId : ''), summe);
        finishDemo(res.d.orderId, summe, true);
        return;
      }
      // Echtbetrieb: weiter zu Stripe
      if (res.ok && res.d.url) {
        shopEvent('begin_payment', art + (res.d.orderId ? ' · ' + res.d.orderId : ''), summe);
        window.location.href = res.d.url;
        return;
      }
      coError(res.d.error || 'Bestellung fehlgeschlagen. Bitte erneut versuchen.');
      btn.disabled = false; btn.textContent = prev;
    }).catch(function () {
      // Backend nicht erreichbar. Auf einer Konzeptseite ist das kein Beinbruch —
      // ehrlich bleiben statt einen Erfolg vorzutäuschen: die Bestätigung sagt
      // explizit, dass die Meldung nicht rausging.
      if (KONZEPT_MODUS) {
        shopEvent('demo_order_offline', art, summe);
        finishDemo('', summe, false);
        return;
      }
      coError('Verbindungsfehler. Bitte erneut versuchen.');
      btn.disabled = false; btn.textContent = prev;
    });
  }

  /* ── Abschluss im Konzept-Modus ────────────────────────────────────────── */
  // gemeldet = true → der Betreiber wurde per Telegram informiert
  function finishDemo(oid, summe, gemeldet) {
    cart = {}; saveCart(); renderCart();
    closeCheckout(); closeCart();

    $('#confirmTitle').textContent = 'Danke fürs Ausprobieren!';
    $('#confirmSub').innerHTML = 'Das war eine <strong>Testbestellung</strong>. Diese Website ist ein '
      + 'Gestaltungsentwurf — es wurde <strong>nichts bestellt, nichts bezahlt und nichts geliefert</strong>.';
    renderOrderItems($('#confirmItems'), null);
    $('#confirmPickupRow').hidden = true;

    $('#confirmOidRow').hidden = !oid;
    $('#confirmOid').textContent = oid || '—';
    $('#confirmModeLabel').textContent = 'Warenkorbwert';
    $('#confirmTotal').textContent = fmt(summe);
    $('#confirmStatus').textContent = gemeldet ? 'Testbestellung übermittelt' : 'nur lokal ausgelöst';
    $('#confirmNote').innerHTML = gemeldet
      ? 'Der Ersteller der Seite wurde benachrichtigt. Wenn du <strong>wirklich</strong> bei ANTEPLI '
        + 'bestellen möchtest, ruf bitte direkt im Laden am Waller Ring 121a an.'
      : 'Die Benachrichtigung konnte gerade nicht gesendet werden — für dich ändert das nichts, '
        + 'es war ohnehin keine echte Bestellung.';

    openModal('#confirmModal', '#confirmBackdrop');
  }

  /* ═════════════════ Rückkehr von Stripe / Bestätigung ════════════════════ */

  function renderOrderItems(ul, lines) {
    if (!ul) return;
    if (!lines || !lines.length) { ul.innerHTML = ''; ul.hidden = true; return; }
    ul.innerHTML = lines.map(function (l) {
      return '<li class="oi-row"><span class="oi-qty">' + l.qty + '×</span>'
        + '<span class="oi-name">' + esc(l.name) + (l.sizeLabel ? ' · ' + esc(l.sizeLabel) : '') + '</span>'
        + '<span class="oi-price">' + fmt(l.lineTotal) + '</span></li>';
    }).join('');
    ul.hidden = false;
  }

  function openConfirm(oid) {
    // Texte zurücksetzen — finishDemo() überschreibt sie im Konzept-Modus
    $('#confirmTitle').textContent = 'Teşekkürler!';
    $('#confirmSub').textContent = 'Deine Zahlung ist eingegangen — wir bereiten alles frisch für dich zu.';
    $('#confirmNote').textContent = 'Notier dir deine Bestellnummer — bei Rückfragen einfach angeben.';
    $('#confirmOidRow').hidden = false;
    $('#confirmOid').textContent = oid || '—';
    $('#confirmTotal').textContent = '—';
    $('#confirmStatus').textContent = 'wird geprüft …';
    $('#confirmPickupRow').hidden = true;
    renderOrderItems($('#confirmItems'), null);
    openModal('#confirmModal', '#confirmBackdrop');
    shopEvent('purchase', oid || 'ohne Nummer');

    if (!oid) return;
    // Der Webhook braucht einen Moment — kurz nachfragen (max. 5 Versuche).
    var tries = 0;
    (function poll() {
      fetch(ORDER_API + '/order/' + encodeURIComponent(oid))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d && d.total != null) {
            $('#confirmModeLabel').textContent = d.mode === 'lieferung' ? 'Lieferung' : 'Abholung';
            $('#confirmTotal').textContent = fmt(d.total);
            renderOrderItems($('#confirmItems'), d.lines);
            if (d.pickup && d.pickup.date) {
              $('#confirmPickup').textContent = deDate(d.pickup.date) + (d.pickup.time ? ' · ' + d.pickup.time : '');
              $('#confirmPickupRow').hidden = false;
            }
            $('#confirmStatus').textContent = d.status === 'paid' ? 'bezahlt' : 'wird geprüft …';
            if (d.status === 'paid') return;
          }
          if (++tries < 5) setTimeout(poll, 1500);
          else $('#confirmStatus').textContent = 'in Bearbeitung';
        })
        .catch(function () {
          if (++tries < 5) setTimeout(poll, 1500);
          else $('#confirmStatus').textContent = 'bezahlt';
        });
    })();
  }

  function handleOrderReturn() {
    var p = new URLSearchParams(location.search);
    var b = p.get('bestellung');
    if (!b) return;
    if (b === 'ok') {
      cart = {}; saveCart(); renderCart(); closeCart(); closeCheckout();
      var oid = p.get('oid') || '';
      if (oid) { try { localStorage.setItem(ORDER_KEY, oid); } catch (e) {} }
      openConfirm(oid);
    } else if (b === 'abbruch') {
      shopEvent('checkout_abort', 'Zahlung abgebrochen');
      if (cartCount() > 0) openCart();   // Warenkorb bleibt erhalten
    }
    history.replaceState(null, '', location.pathname);
  }

  /* ═══════════════════════════ Verdrahtung ════════════════════════════════ */

  function wire() {
    // Produktkarten (Event-Delegation — Karten werden dynamisch gerendert)
    document.addEventListener('click', function (e) {
      var add = e.target.closest('[data-add]');
      if (add) { addToCart(add.getAttribute('data-add')); return; }

      var so = e.target.closest('.size-opt');
      if (so && pendingSizeId) {
        var id = pendingSizeId;
        closeSizeModal();
        addKey(id + '|' + so.getAttribute('data-size'));
        return;
      }

      var dec = e.target.closest('[data-dec]');
      if (dec) { changeQty(dec.getAttribute('data-dec'), -1); return; }
      var inc = e.target.closest('[data-inc]');
      if (inc) { changeQty(inc.getAttribute('data-inc'), 1); return; }

      var mb = e.target.closest('.mode-btn');
      if (mb) { mode = mb.getAttribute('data-mode'); renderCart(); return; }

      // Blech-Konfigurator
      var bs = e.target.closest('[data-blech-sorte]');
      if (bs) { blechState.id = bs.getAttribute('data-blech-sorte'); paintBlech(); return; }
      var bg = e.target.closest('[data-blech-groesse]');
      if (bg) { blechState.size = bg.getAttribute('data-blech-groesse'); paintBlech(); return; }
      if (e.target.closest('#blechAdd')) { addBlech(); return; }

      // Alles, was den Warenkorb öffnen soll
      if (e.target.closest('[data-cart-open]') || e.target.closest('#cartFab')) {
        e.preventDefault(); openCart(); return;
      }
    });

    $('#cartClose').addEventListener('click', closeCart);
    $('#shScrim').addEventListener('click', closeCart);
    $('#checkoutBtn').addEventListener('click', function () { closeCart(); openCheckout(); });
    $('#sizeClose').addEventListener('click', closeSizeModal);
    $('#sizeBackdrop').addEventListener('click', closeSizeModal);
    $('#checkoutClose').addEventListener('click', closeCheckout);
    $('#checkoutBackdrop').addEventListener('click', closeCheckout);
    $('#checkoutForm').addEventListener('submit', submitCheckout);
    $('#confirmClose').addEventListener('click', function () { closeModal('#confirmModal', '#confirmBackdrop'); });
    $('#confirmBackdrop').addEventListener('click', function () { closeModal('#confirmModal', '#confirmBackdrop'); });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if ($('#sizeModal').classList.contains('is-on')) return closeSizeModal();
      if ($('#checkoutModal').classList.contains('is-on')) return closeCheckout();
      if ($('#confirmModal').classList.contains('is-on')) return closeModal('#confirmModal', '#confirmBackdrop');
      if (document.body.classList.contains('cart-open')) return closeCart();
    });

    var anz = $('#blechAnzahl');
    if (anz) anz.addEventListener('change', function () {
      blechState.qty = parseInt(this.value, 10) || 1;
      paintBlech();
    });

    // Öffnungsstatus im Blick behalten (Warenkorb sperrt sich nach Ladenschluss)
    setInterval(function () { if (cartCount()) renderCart(); }, 60000);
  }

  function init() {
    mountUI();
    renderGrids();
    renderBlechConfig();
    wire();
    renderCart();
    handleOrderReturn();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // Für die Seite nutzbar (z. B. Öffnungszeiten-Badge in bestellen.html)
  window.anteplishop = { status: shopStatus, closedMsg: closedMsg, open: openCart };
})();
