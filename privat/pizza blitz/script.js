/* ===== Pizza Blitz Bremen — App ===== */
(function () {
  'use strict';

  /* ---------- Data ---------- */
  var CONFIG = { minOrder: 12, freeFrom: 20, deliveryFee: 1.5 };

  /* Öffnungszeiten (Bremer Ortszeit). MUSS mit order-api/menu.js (HOURS) übereinstimmen.
     Pro Wochentag (0=So … 6=Sa): Liste von [öffnet, schließt] in Minuten seit Mitternacht.
     Leeres Array = an dem Tag geschlossen. Letzte Bestellung: lastOrderMin vor Ladenschluss. */
  var HOURS = {
    tz: 'Europe/Berlin',
    lastOrderMin: 15,
    days: {
      0: [[11 * 60, 22 * 60]], 1: [[11 * 60, 22 * 60]], 2: [[11 * 60, 22 * 60]],
      3: [[11 * 60, 22 * 60]], 4: [[11 * 60, 22 * 60]], 5: [[11 * 60, 22 * 60]], 6: [[11 * 60, 22 * 60]]
    }
  };
  var DOW_LABEL = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  // Bremer Ortszeit als {dow, minutes} — DST-sicher über Intl.
  function localNow(date) {
    var f = new Intl.DateTimeFormat('en-US', { timeZone: HOURS.tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
    var p = {}; f.formatToParts(date || new Date()).forEach(function (x) { p[x.type] = x.value; });
    var map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    var hh = parseInt(p.hour, 10); if (hh === 24) hh = 0;
    return { dow: map[p.weekday], minutes: hh * 60 + parseInt(p.minute, 10) };
  }
  // { open, nextOpen? } — nextOpen = {dow, minutes} der nächsten Öffnung (bis 7 Tage voraus).
  function shopStatus(date) {
    var now = localNow(date), spans = HOURS.days[now.dow] || [];
    for (var i = 0; i < spans.length; i++) {
      if (now.minutes >= spans[i][0] && now.minutes < spans[i][1] - HOURS.lastOrderMin) return { open: true };
    }
    for (var d = 0; d < 7; d++) {
      var dow = (now.dow + d) % 7, ds = HOURS.days[dow] || [];
      for (var j = 0; j < ds.length; j++) {
        if (d === 0 && now.minutes >= ds[j][0]) continue; // heutiges Fenster schon vorbei
        return { open: false, nextOpen: { dow: dow, minutes: ds[j][0], sameDay: d === 0 } };
      }
    }
    return { open: false };
  }
  function fmtMin(m) { var h = Math.floor(m / 60), mm = m % 60; return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm; }
  function closedMsg(st) {
    if (!st.nextOpen) return 'Bestellungen sind aktuell nicht möglich.';
    var n = st.nextOpen, when = n.sameDay ? 'heute' : DOW_LABEL[n.dow];
    return 'Wir haben gerade geschlossen. Bestellungen wieder ' + when + ' ab ' + fmtMin(n.minutes) + ' Uhr.';
  }

  var MENU = [
    { id:'pizza', name:'Pizza', note:'Ø 26 cm · größere Größen gegen Aufpreis', items:[
      { name:'Margherita', desc:'Tomatensoße, Mozzarella, Basilikum', price:8.0, diet:'veg', alg:['a','g'] },
      { name:'Salami', desc:'Tomatensoße, Käse, italienische Salami', price:9.0, diet:'', alg:['a','g'] },
      { name:'Funghi', desc:'Tomatensoße, Käse, frische Champignons', price:9.0, diet:'veg', alg:['a','g'] },
      { name:'Hawaii', desc:'Tomatensoße, Käse, Schinken, Ananas', price:9.5, diet:'', alg:['a','g'] },
      { name:'Tonno', desc:'Tomatensoße, Käse, Thunfisch, rote Zwiebeln', price:10.0, diet:'', alg:['a','d','g'] },
      { name:'Diavolo', desc:'Tomatensoße, Käse, scharfe Salami, Peperoni, Chili', price:10.5, diet:'', alg:['a','g'] },
      { name:'Vegetaria', desc:'Tomatensoße, Käse, Paprika, Champignons, Zwiebeln, Mais', price:10.0, diet:'veg', alg:['a','g'] },
      { name:'Blitz Spezial', desc:'Tomatensoße, Käse, Salami, Schinken, Champignons, Paprika', price:11.5, diet:'', alg:['a','g'] } ] },
    { id:'calzone', name:'Calzone', note:'gefüllte Pizzatasche, hausgemachter Teig', items:[
      { name:'Calzone Classico', desc:'Schinken, Champignons, Käse, Tomatensoße', price:10.5, diet:'', alg:['a','g'] },
      { name:'Calzone Vegetale', desc:'Spinat, Champignons, Paprika, Käse', price:10.0, diet:'veg', alg:['a','g'] },
      { name:'Calzone Blitz', desc:'Salami, Schinken, Zwiebeln, Käse, scharfe Soße', price:11.5, diet:'', alg:['a','g'] } ] },
    { id:'auflauf', name:'Auflauf', note:'mit Käse überbacken, dazu Pizzabrötchen', items:[
      { name:'Nudel-Auflauf Schinken', desc:'Penne, Schinken, Sahnesoße, Käse überbacken', price:9.5, diet:'', alg:['a','g'] },
      { name:'Broccoli-Auflauf', desc:'Broccoli, Kartoffeln, Sahnesoße, Käse überbacken', price:9.0, diet:'veg', alg:['g'] },
      { name:'Tortellini-Auflauf', desc:'Tortellini, Tomaten-Sahne-Soße, Käse überbacken', price:10.0, diet:'veg', alg:['a','c','g'] } ] },
    { id:'rollo', name:'Rollo', note:'gerollt und überbacken, mit Salat und Soße', items:[
      { name:'Rollo Hähnchen', desc:'Hähnchenbrust, Eisbergsalat, Tomaten, Soße nach Wahl', price:9.5, diet:'', alg:['a','g'] },
      { name:'Rollo Sucuk', desc:'Knoblauchwurst, Salat, Zwiebeln, scharfe Soße', price:9.5, diet:'', alg:['a','g'] },
      { name:'Rollo Vegetarisch', desc:'Käse, Salat, Tomaten, Gurken, Kräutersoße', price:8.5, diet:'veg', alg:['a','g'] },
      { name:'Rollo Falafel', desc:'Hausgemachte Falafel, Salat, veganes Tzatziki', price:8.5, diet:'vegan', alg:['a'] } ] },
    { id:'baguette', name:'Baguette', note:'ofenfrisch überbacken', items:[
      { name:'Baguette Salami', desc:'Salami, Tomaten, Käse überbacken', price:7.5, diet:'', alg:['a','g'] },
      { name:'Baguette Hähnchen', desc:'Hähnchen, Paprika, Zwiebeln, Käse überbacken', price:8.0, diet:'', alg:['a','g'] },
      { name:'Baguette Mozzarella', desc:'Mozzarella, Tomaten, Basilikum, Käse überbacken', price:7.5, diet:'veg', alg:['a','g'] } ] },
    { id:'nudeln', name:'Nudeln', note:'al dente, mit frisch geriebenem Käse', items:[
      { name:'Spaghetti Bolognese', desc:'Hausgemachte Hackfleischsoße', price:8.5, diet:'', alg:['a'] },
      { name:'Penne Arrabbiata', desc:'Scharfe Tomatensoße, Knoblauch, Chili', price:8.0, diet:'vegan', alg:['a'] },
      { name:'Tortellini Panna', desc:'Sahnesoße, Schinken, Erbsen', price:9.0, diet:'', alg:['a','c','g'] },
      { name:'Spaghetti Napoli', desc:'Fruchtige Tomatensoße, Basilikum', price:7.5, diet:'vegan', alg:['a'] } ] },
    { id:'salate', name:'Salate', note:'mit hausgemachtem Dressing und Pizzabrötchen', items:[
      { name:'Gemischter Salat', desc:'Eisberg, Tomaten, Gurken, Mais, Zwiebeln', price:6.5, diet:'vegan', alg:[] },
      { name:'Bauernsalat', desc:'Gemischter Salat mit Schafskäse und Oliven', price:7.5, diet:'veg', alg:['g'] },
      { name:'Thunfischsalat', desc:'Gemischter Salat mit Thunfisch und Ei', price:8.0, diet:'', alg:['c','d'] },
      { name:'Mozzarella-Salat', desc:'Tomaten, Mozzarella, Basilikum, Balsamico', price:8.0, diet:'veg', alg:['g'] } ] },
    { id:'beilagen', name:'Beilagen', note:'die perfekte Ergänzung', items:[
      { name:'Pizzabrötchen (6 Stk.)', desc:'Hausgemacht, mit Kräuterbutter oder Tzatziki', price:4.0, diet:'veg', alg:['a','g'] },
      { name:'Pizzabrötchen gefüllt (6 Stk.)', desc:'Gefüllt mit Käse oder Salami', price:5.5, diet:'', alg:['a','g'] },
      { name:'Pommes Frites', desc:'Knusprig, mit Ketchup oder Mayo', price:3.5, diet:'vegan', alg:[] },
      { name:'Chicken Wings (6 Stk.)', desc:'Würzig mariniert, mit Dip', price:6.0, diet:'', alg:['a'] } ] },
    { id:'nachtisch', name:'Nachtisch', note:'süßer Abschluss', items:[
      { name:'Tiramisu', desc:'Hausgemacht, nach Familienrezept', price:4.5, diet:'veg', alg:['a','c','g'] },
      { name:'Milchreis', desc:'Warm, mit Zimt und Zucker', price:3.5, diet:'veg', alg:['g'] },
      { name:"Ben & Jerry's (465 ml)", desc:'Cookie Dough, Chocolate Fudge Brownie u.a.', price:8.5, diet:'veg', alg:['a','g'] } ] },
    { id:'getraenke', name:'Getränke', note:'gut gekühlt', items:[
      { name:'Coca-Cola / Fanta / Sprite (1 l)', desc:'Auch als Zero/Light erhältlich', price:3.0, diet:'vegan', alg:[] },
      { name:'Wasser (0,5 l)', desc:'Still oder sprudelnd', price:2.0, diet:'vegan', alg:[] },
      { name:'Eistee Pfirsich (0,5 l)', desc:'Erfrischend fruchtig', price:2.5, diet:'vegan', alg:[] },
      { name:"Beck's (0,33 l)", desc:'Bremer Original', price:2.5, diet:'', alg:['a'] } ] }
  ];

  var ALLERGEN_NAMES = {
    a:'Glutenhaltiges Getreide', b:'Krebstiere', c:'Eier', d:'Fisch', e:'Erdnüsse',
    f:'Sojabohnen', g:'Milch/Laktose', h:'Schalenfrüchte (Nüsse)', i:'Sellerie',
    j:'Senf', k:'Sesamsamen', l:'Schwefeldioxid/Sulfite', m:'Lupinen', n:'Weichtiere'
  };

  var REVIEWS = [
    { name:'Katrin M.', stars:5, when:'vor 2 Wochen', text:'Der hausgemachte Pizzateig ist einfach der beste in Bremen. Seit Jahren unsere Nummer eins am Lehesterdeich!' },
    { name:'Jonas B.', stars:5, when:'vor 1 Monat', text:'Blitzschnelle Abholung — bestellt, 15 Minuten später war die Pizza fertig und noch ofenheiß. Top!' },
    { name:'Sabine H.', stars:5, when:'vor 1 Monat', text:'Super freundliches Personal am Telefon und an der Tür. Man merkt, dass hier ein eingespieltes Team arbeitet.' },
    { name:'Murat K.', stars:4, when:'vor 2 Monaten', text:'Rollo Hähnchen ist riesig und richtig lecker. Lieferung dauerte an einem Freitagabend etwas länger, aber die Qualität stimmt.' },
    { name:'Frauke L.', stars:5, when:'vor 3 Monaten', text:'Das Catering für unsere Vereinsfeier war perfekt organisiert — pünktlich, warm und für jeden was dabei.' },
    { name:'Tim R.', stars:4, when:'vor 3 Monaten', text:'Die hausgemachte Tomatensoße schmeckt man sofort raus. Pizzabrötchen mit Kräuterbutter sind ein Muss.' },
    { name:'Anna W.', stars:5, when:'vor 4 Monaten', text:'Bestelle seit über zehn Jahren hier. Konstant gute Qualität — das schafft kaum ein anderer Lieferdienst.' },
    { name:'Dirk S.', stars:5, when:'vor 5 Monaten', text:'Barrierefrei und Barzahlung möglich — für meinen Vater im Rollstuhl ist das Gold wert. Danke, Team Blitz!' },
    { name:'Lena P.', stars:4, when:'vor 6 Monaten', text:'Vegane Optionen wie der Falafel-Rollo sind wirklich gut gewürzt. Gerne noch mehr davon auf die Karte!' }
  ];

  var TICKER = ['Blitzschnell geliefert','Hausgemachter Teig','Seit 1990 in Bremen','Frische Zutaten','Steinofen · 400 °C','Catering für jedes Fest'];

  // Blitz-Tracker: eigene Etappen je Bestellart
  var TRACKS = {
    lieferung: {
      stations: [
        { label:'Bestellt', sub:'Bestellung eingegangen' },
        { label:'Im Ofen', sub:'Bei 400 °C gebacken' },
        { label:'Unterwegs', sub:'Fahrer losgefahren' },
        { label:'Geliefert', sub:'Guten Appetit!' }
      ],
      titles: ['Bestellung eingegangen','Deine Pizza ist im Ofen','Dein Fahrer ist unterwegs','Geliefert — guten Appetit!'],
      texts: [
        'Wir haben deine Bestellung erhalten und legen gleich los.',
        'Frisch belegt und bei 400 °C im Steinofen — gleich duftet es.',
        'Noch wenige Minuten bis zu deiner Haustür.',
        'Deine Bestellung wurde zugestellt. Lass es dir schmecken!'
      ],
      etaMin: 35, etaLabel: 'Voraussichtliche Lieferung'
    },
    abholung: {
      stations: [
        { label:'Bestellt', sub:'Bestellung eingegangen' },
        { label:'Zubereitung', sub:'Wird frisch belegt' },
        { label:'Im Ofen', sub:'Bei 400 °C gebacken' },
        { label:'Abholbereit', sub:'Bitte abholen' }
      ],
      titles: ['Bestellung eingegangen','Wird frisch zubereitet','Deine Pizza ist im Ofen','Abholbereit — bis gleich!'],
      texts: [
        'Wir haben deine Bestellung erhalten und legen gleich los.',
        'Deine Bestellung wird frisch belegt.',
        'Frisch belegt und bei 400 °C im Steinofen — gleich fertig.',
        'Deine Bestellung ist fertig — hol sie dir ab. Bis gleich!'
      ],
      etaMin: 20, etaLabel: 'Voraussichtlich fertig'
    }
  };
  var trackerMode = 'lieferung';

  /* ---------- Helpers ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fmt = function (n) { return n.toFixed(2).replace('.', ',') + ' €'; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]; }); };

  // flat lookup of all items (mit Kategorie für die Größenwahl)
  var ALL = {};
  MENU.forEach(function (sec) { sec.items.forEach(function (it) { it.id = (it.name + sec.id).toLowerCase().replace(/[^a-z0-9]/g, ''); it.cat = sec.id; ALL[it.id] = it; }); });

  /* ---------- Pizza-Größen ---------- */
  var SIZES = [
    { id: 'klein', label: 'Klein', info: 'Ø 26 cm', add: 0 },
    { id: 'mittel', label: 'Mittel', info: 'Ø 32 cm', add: 2.5 },
    { id: 'gross', label: 'Groß', info: 'Ø 40 cm', add: 5 }
  ];
  var SIZE_BY_ID = {};
  SIZES.forEach(function (s) { SIZE_BY_ID[s.id] = s; });

  // Warenkorb-Keys: "itemId" oder "itemId|größe" — liefert Anzeigename + Preis
  function keyInfo(key) {
    var p = key.split('|'), it = ALL[p[0]];
    if (!it) return { name: key, price: 0 };
    var s = p[1] ? SIZE_BY_ID[p[1]] : null;
    return {
      name: it.name + (s ? ' · ' + s.label + ' (' + s.info + ')' : ''),
      price: it.price + (s ? s.add : 0)
    };
  }

  /* ---------- Pizza SVG factory (top-down) ---------- */
  function scatter(n, maxR, seed) {
    var out = [], g = 2.399963;
    for (var i = 0; i < n; i++) {
      var r = maxR * Math.sqrt((i + 0.5) / n), a = i * g + (seed || 0);
      out.push([100 + Math.cos(a) * r, 100 + Math.sin(a) * r]);
    }
    return out;
  }
  var salami = function (x, y) {
    return '<circle cx="'+x+'" cy="'+y+'" r="9" fill="#b8322a"/><circle cx="'+x+'" cy="'+y+'" r="9" fill="none" stroke="#96271f" stroke-width="1.2"/>'
      + '<circle cx="'+(x-3)+'" cy="'+(y-2)+'" r="1.3" fill="#e8b7b0"/><circle cx="'+(x+3)+'" cy="'+(y+1)+'" r="1.2" fill="#e8b7b0"/><circle cx="'+(x)+'" cy="'+(y+3)+'" r="1.1" fill="#e8b7b0"/>';
  };
  var basil = function (x, y, rot) {
    return '<g transform="translate('+x+' '+y+') rotate('+rot+')"><path d="M0 -8 C6 -4 6 5 0 9 C-6 5 -6 -4 0 -8Z" fill="#3fa653"/><path d="M0 -7 V8" stroke="#2c7d3e" stroke-width="1"/></g>';
  };
  var mozza = function (x, y) {
    return '<circle cx="'+x+'" cy="'+y+'" r="8" fill="#fdfcf3"/><circle cx="'+x+'" cy="'+y+'" r="8" fill="none" stroke="#e9e1cb" stroke-width="1"/>';
  };
  var mush = function (x, y) {
    return '<g transform="translate('+x+' '+y+')"><path d="M-8 1 A8 6 0 0 1 8 1 Z" fill="#ece4d2"/><rect x="-2.3" y="1" width="4.6" height="6" rx="2" fill="#d8ccb2"/></g>';
  };
  var pepper = function (x, y, rot) {
    return '<path d="M-9 0 A9 9 0 0 1 9 0" transform="translate('+x+' '+y+') rotate('+rot+')" fill="none" stroke="#3f8f43" stroke-width="4" stroke-linecap="round"/>';
  };
  var chili = function (x, y, rot) {
    return '<path d="M-8 0 Q0 -4 8 0" transform="translate('+x+' '+y+') rotate('+rot+')" fill="none" stroke="#d0342a" stroke-width="3.2" stroke-linecap="round"/>';
  };
  var ham = function (x, y, rot) {
    return '<rect x="-8" y="-6" width="16" height="12" rx="3.5" transform="translate('+x+' '+y+') rotate('+rot+')" fill="#e79b93"/>';
  };
  function pizzaBase() {
    var s = '<circle cx="100" cy="100" r="97" fill="#d3923b"/><circle cx="100" cy="100" r="90" fill="#e7ad55"/>';
    // char spots on crust
    for (var i = 0; i < 11; i++) { var a = i * 0.9; var x = 100 + Math.cos(a) * 93, y = 100 + Math.sin(a) * 93; s += '<ellipse cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" rx="4.5" ry="3" fill="#bd7f2f" opacity=".7" transform="rotate('+(a*57).toFixed(0)+' '+x.toFixed(1)+' '+y.toFixed(1)+')"/>'; }
    s += '<circle cx="100" cy="100" r="83" fill="#bf3a2c"/><circle cx="100" cy="100" r="80" fill="#f0c24b"/>';
    // cheese texture
    scatter(9, 66, 0.4).forEach(function (p) { s += '<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="6" fill="#f4cd63" opacity=".55"/>'; });
    return s;
  }
  function makePizza(kind) {
    var t = '', seeds = { margherita:0.6, diavolo:1.7, blitz:2.6, hero:0.9 };
    var s0 = seeds[kind] || 0;
    if (kind === 'margherita') {
      scatter(6, 60, s0).forEach(function (p) { t += mozza(p[0], p[1]); });
      scatter(7, 64, s0 + 1).forEach(function (p, i) { t += basil(p[0], p[1], i * 57); });
      scatter(4, 50, s0 + 2).forEach(function (p) { t += '<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="5" fill="#d0402f"/>'; });
    } else if (kind === 'diavolo') {
      scatter(8, 64, s0).forEach(function (p) { t += salami(p[0], p[1]); });
      scatter(6, 56, s0 + 1.2).forEach(function (p, i) { t += chili(p[0], p[1], i * 63); });
      scatter(5, 48, s0 + 2.4).forEach(function (p, i) { t += pepper(p[0], p[1], i * 72); });
    } else { // blitz + hero: fully loaded
      scatter(6, 64, s0).forEach(function (p) { t += salami(p[0], p[1]); });
      scatter(5, 58, s0 + 1).forEach(function (p, i) { t += ham(p[0], p[1], i * 49); });
      scatter(6, 52, s0 + 2).forEach(function (p) { t += mush(p[0], p[1]); });
      scatter(5, 60, s0 + 3).forEach(function (p, i) { t += pepper(p[0], p[1], i * 61); });
      scatter(4, 44, s0 + 4).forEach(function (p) { t += mozza(p[0], p[1]); });
    }
    return '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">' + pizzaBase() + t + '</svg>';
  }

  /* ---------- Cart state ---------- */
  // Adresse des Bestell-Backends (Cloudflare Worker). Nach dem Deploy ggf. anpassen.
  var ORDER_API = 'https://pizza-blitz-orders.seyle450.workers.dev';
  var cart = {}, mode = 'lieferung';
  // Warenkorb übersteht den Stripe-Redirect (localStorage)
  try { var _c = JSON.parse(localStorage.getItem('pb_cart') || '{}'); if (_c && typeof _c === 'object') cart = _c; } catch (e) {}
  function saveCart() { try { localStorage.setItem('pb_cart', JSON.stringify(cart)); } catch (e) {} }

  function cartCount() { var n = 0; for (var k in cart) n += cart[k]; return n; }
  function subtotal() { var s = 0; for (var k in cart) s += keyInfo(k).price * cart[k]; return s; }

  function addKey(key) {
    cart[key] = (cart[key] || 0) + 1;
    renderCart(); bumpFab(); openCart();
  }
  // Pizzen fragen zuerst nach der Größe, alles andere landet direkt im Korb
  function addToCart(id) {
    if (ALL[id] && ALL[id].cat === 'pizza') openSizeModal(id);
    else addKey(id);
  }

  /* ---------- Größenwahl-Modal ---------- */
  var pendingSizeId = null;
  function openSizeModal(id) {
    pendingSizeId = id;
    var it = ALL[id];
    $('#sizeItemName').textContent = it.name + ' — ' + it.desc;
    var html = '';
    SIZES.forEach(function (s) {
      html += '<button class="size-opt" data-size="' + s.id + '">'
        + '<span class="so-label">' + s.label + '<span class="so-info">' + s.info + '</span></span>'
        + '<span class="so-price">' + fmt(it.price + s.add) + '</span></button>';
    });
    $('#sizeOptions').innerHTML = html;
    $('#sizeBackdrop').hidden = false;
    $('#sizeModal').setAttribute('aria-hidden', 'false');
    var first = $('.size-opt'); if (first) first.focus();
  }
  function closeSizeModal() {
    pendingSizeId = null;
    $('#sizeBackdrop').hidden = true;
    $('#sizeModal').setAttribute('aria-hidden', 'true');
  }

  /* ---------- Produkt-Detail ---------- */
  // Bild-Pfad folgt der Item-ID: assets/menu/{id}.png — sobald echte Fotos dort abgelegt
  // werden, tauchen sie automatisch auf. Bis dahin greift der onerror-Platzhalter.
  var pendingViewId = null;
  function openProductModal(id) {
    var it = ALL[id];
    if (!it) return;
    pendingViewId = id;
    $('#productImg').src = 'assets/menu/' + id + '.png';
    $('#productImg').alt = it.name;
    $('#productTitle').textContent = it.name;
    $('#productDesc').textContent = it.desc;
    var tags = '';
    if (it.diet === 'vegan') tags += '<span class="mi-tag vegan">vegan</span>';
    else if (it.diet === 'veg') tags += '<span class="mi-tag veg">vegetarisch</span>';
    $('#productTags').innerHTML = tags;
    var algNames = (it.alg || []).map(function (l) { return l + ' = ' + ALLERGEN_NAMES[l]; });
    $('#productAlg').textContent = algNames.length ? 'Allergene: ' + algNames.join(', ') : '';
    $('#productPrice').textContent = it.cat === 'pizza' ? 'ab ' + fmt(it.price) : fmt(it.price);
    $('#productBackdrop').hidden = false;
    $('#productModal').setAttribute('aria-hidden', 'false');
  }
  function closeProductModal() {
    pendingViewId = null;
    $('#productBackdrop').hidden = true;
    $('#productModal').setAttribute('aria-hidden', 'true');
  }

  /* ---------- Checkout (Kasse → Stripe) ---------- */
  function checkoutTotals() {
    var sub = subtotal(), isLief = mode === 'lieferung';
    var delivery = isLief ? (sub >= CONFIG.freeFrom ? 0 : CONFIG.deliveryFee) : 0;
    return { sub: sub, isLief: isLief, delivery: delivery, total: sub + delivery };
  }
  function openCheckout() {
    var st = shopStatus();
    if (!st.open) { alert(closedMsg(st)); return; }
    var t = checkoutTotals();
    $('#coMode').textContent = t.isLief ? 'Lieferung' : 'Abholung';
    $('#coDelivery').style.display = t.isLief ? '' : 'none';
    $('#coDelLabel').textContent = t.isLief ? 'Lieferung' : 'Abholung';
    $('#coSub').textContent = fmt(t.sub);
    $('#coDel').textContent = t.isLief ? (t.delivery === 0 ? 'kostenlos' : fmt(t.delivery)) : '—';
    $('#coTotal').textContent = fmt(t.total);
    $('#coPayBtn').textContent = 'Jetzt bezahlen · ' + fmt(t.total);
    $('#coError').hidden = true;
    $('#checkoutBackdrop').hidden = false;
    $('#checkoutModal').setAttribute('aria-hidden', 'false');
  }
  function closeCheckout() {
    $('#checkoutBackdrop').hidden = true;
    $('#checkoutModal').setAttribute('aria-hidden', 'true');
  }
  function coError(msg) { var e = $('#coError'); e.textContent = msg; e.hidden = false; }
  async function submitCheckout(e) {
    e.preventDefault();
    var f = e.target, el = f.elements;
    var name = el['name'].value.trim(), phone = el['phone'].value.trim();
    var isLief = mode === 'lieferung';
    if (!name || !phone) { coError('Bitte Name und Telefon angeben.'); return; }
    if (isLief && (!el['street'].value.trim() || !el['zip'].value.trim())) { coError('Bitte Straße und PLZ angeben.'); return; }
    if (cartCount() === 0) { coError('Dein Warenkorb ist leer.'); return; }
    var payload = {
      items: cart, mode: mode, time: 'asap',
      customer: { name: name, phone: phone, email: el['email'].value.trim() },
      note: el['note'].value.trim()
    };
    if (isLief) payload.address = { street: el['street'].value.trim(), zip: el['zip'].value.trim(), city: el['city'].value.trim() };
    var btn = $('#coPayBtn'), prev = btn.textContent;
    btn.disabled = true; btn.textContent = 'Weiterleitung …'; $('#coError').hidden = true;
    try {
      var r = await fetch(ORDER_API + '/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      var d = await r.json().catch(function () { return {}; });
      if (r.ok && d.url) { window.location.href = d.url; return; }
      coError(d.error || 'Bestellung fehlgeschlagen. Bitte erneut versuchen.');
    } catch (err) {
      coError('Verbindungsfehler. Bitte erneut versuchen.');
    }
    btn.disabled = false; btn.textContent = prev;
  }
  function changeQty(id, d) {
    cart[id] = (cart[id] || 0) + d;
    if (cart[id] <= 0) delete cart[id];
    renderCart();
  }
  function bumpFab() {
    var fab = $('#cartFab');
    if (window.gsap) gsap.fromTo(fab, { scale: 0.8 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
  }

  function renderCart() {
    saveCart();
    var count = cartCount();
    $('#cartCount').textContent = count;
    $('#cartFab').hidden = count === 0;
    if (count === 0 && document.body.classList.contains('cart-open')) { /* keep open, show empty */ }

    var wrap = $('#cartItems'), html = '';
    Object.keys(cart).forEach(function (key) {
      var info = keyInfo(key), q = cart[key];
      html += '<div class="ci-row"><div class="ci-info"><div class="ci-name">' + esc(info.name) + '</div>'
        + '<div class="ci-price">' + fmt(info.price) + ' · ' + fmt(info.price * q) + '</div></div>'
        + '<div class="ci-qty"><button data-dec="' + key + '" aria-label="weniger">−</button><span>' + q + '</span>'
        + '<button data-inc="' + key + '" aria-label="mehr">+</button></div></div>';
    });
    wrap.innerHTML = html;
    $('#cartEmptyMsg').hidden = count > 0;
    $('#cartSummary').hidden = count === 0;

    var sub = subtotal();
    var isLief = mode === 'lieferung';
    var delivery = isLief ? (sub >= CONFIG.freeFrom ? 0 : CONFIG.deliveryFee) : 0;
    var belowMin = isLief && sub > 0 && sub < CONFIG.minOrder;
    $('#sumSubtotal').textContent = fmt(sub);
    $('#sumDelivery').textContent = !isLief ? 'Abholung' : (delivery === 0 ? 'kostenlos' : fmt(delivery));
    $('#sumTotal').textContent = fmt(sub + delivery);
    $('#minNote').hidden = !belowMin;
    $('#minNote').textContent = 'Mindestbestellwert für Lieferung: ' + fmt(CONFIG.minOrder) + ' (fehlen ' + fmt(CONFIG.minOrder - sub) + ')';

    var st = shopStatus();
    $('#closedNote').hidden = st.open;
    if (!st.open) $('#closedNote').textContent = closedMsg(st);
    var btn = $('#checkoutBtn');
    btn.disabled = belowMin || count === 0 || !st.open;
    btn.textContent = st.open ? 'Zur Kasse' : 'Geschlossen';
  }

  function openCart() { document.body.classList.add('cart-open'); $('#cartDrawer').setAttribute('aria-hidden', 'false'); }
  function closeCart() { document.body.classList.remove('cart-open'); $('#cartDrawer').setAttribute('aria-hidden', 'true'); }

  /* ---------- Render menu ---------- */
  var currentDiet = 'alle', currentSearch = '';
  function matchDiet(it) {
    if (currentDiet === 'veg') return it.diet === 'veg' || it.diet === 'vegan';
    if (currentDiet === 'vegan') return it.diet === 'vegan';
    return true;
  }
  function matchSearch(it) {
    if (!currentSearch) return true;
    var q = currentSearch;
    return it.name.toLowerCase().indexOf(q) > -1 || it.desc.toLowerCase().indexOf(q) > -1;
  }
  function renderMenu() {
    var list = $('#menuList'), html = '', shown = 0;
    MENU.forEach(function (sec) {
      var items = sec.items.filter(function (it) { return matchDiet(it) && matchSearch(it); });
      if (!items.length) return;
      shown += items.length;
      html += '<div class="menu-cat" id="cat-' + sec.id + '"><div class="cat-head"><h3>' + esc(sec.name) + '</h3><span class="cat-note">' + esc(sec.note) + '</span></div><div class="menu-items">';
      items.forEach(function (it) {
        var tag = it.diet === 'vegan' ? '<span class="mi-tag vegan">vegan</span>' : (it.diet === 'veg' ? '<span class="mi-tag veg">vegetarisch</span>' : '');
        var alg = (it.alg && it.alg.length) ? '<sup class="mi-alg">(' + it.alg.join(',') + ')</sup>' : '';
        html += '<div class="m-item" data-view="' + it.id + '"><div class="mi-info"><div class="mi-name">' + esc(it.name) + tag + '</div>'
          + '<div class="mi-desc">' + esc(it.desc) + alg + '</div></div>'
          + '<div class="mi-side"><span class="mi-price">' + fmt(it.price) + '</span>'
          + '<button class="mi-add" data-add="' + it.id + '" aria-label="' + esc(it.name) + ' hinzufügen">+</button></div></div>';
      });
      html += '</div></div>';
    });
    list.innerHTML = html;
    $('#menuEmpty').hidden = shown > 0;
  }

  function renderAllergenLegend() {
    var used = {};
    MENU.forEach(function (sec) { sec.items.forEach(function (it) { (it.alg || []).forEach(function (l) { used[l] = true; }); }); });
    var parts = Object.keys(used).sort().map(function (l) { return l + ' = ' + ALLERGEN_NAMES[l]; });
    $('#allergenLegend').innerHTML = 'Allergenkennzeichnung nach LMIV: ' + esc(parts.join(' · '))
      + ' — Beispielangaben, bitte vor Veröffentlichung mit den tatsächlichen Rezepturen abgleichen.';
  }

  /* ---------- Static renders ---------- */
  function renderHighlights() {
    var data = [
      { key:'blitz', name:'Blitz Spezial', desc:'Salami, Schinken, Champignons, Paprika', price:11.5, id:'blitzspezialpizza', photo:'assets/hero.webp' },
      { key:'diavolo', name:'Diavolo', desc:'Scharfe Salami, Peperoni, Chili', price:10.5, id:'diavolopizza', photo:'assets/diavolo.webp' },
      { key:'margherita', name:'Margherita', desc:'Mozzarella, Basilikum, hausgemachte Soße', price:8.0, id:'margheritapizza', photo:'assets/margherita.webp' }
    ];
    var html = '';
    data.forEach(function (d, i) {
      var visual = d.photo
        ? '<img src="' + d.photo + '" alt="" loading="lazy">'
        : makePizza(d.key);
      html += '<article class="hl-card reveal"><div class="hl-pizza" data-rot="' + (i % 2 ? -1 : 1) + '" role="img" aria-label="Pizza ' + esc(d.name) + '">' + visual + '</div>'
        + '<div class="hl-name">' + esc(d.name) + '</div><p class="hl-desc">' + esc(d.desc) + '</p>'
        + '<div class="hl-foot"><span class="hl-price">' + fmt(d.price) + '</span>'
        + '<button class="btn btn-primary btn-sm" data-add="' + d.id + '">In den Warenkorb</button></div></article>';
    });
    $('#highlightGrid').innerHTML = html;
  }
  function renderReviews() {
    var html = '';
    REVIEWS.forEach(function (r) {
      var stars = '★★★★★☆☆☆☆☆'.slice(5 - r.stars, 10 - r.stars);
      html += '<article class="review-card reveal"><div class="rv-head"><span class="rv-avatar">' + esc(r.name.charAt(0)) + '</span>'
        + '<div><div class="rv-name">' + esc(r.name) + '</div><div class="rv-when">' + esc(r.when) + '</div></div></div>'
        + '<div class="rv-stars" aria-label="' + r.stars + ' von 5 Sternen">' + stars + '</div>'
        + '<p class="rv-text">' + esc(r.text) + '</p></article>';
    });
    $('#reviewGrid').innerHTML = html;
  }
  function renderTicker() {
    var half = '';
    for (var k = 0; k < 2; k++) TICKER.forEach(function (t) { half += '<span class="ticker-item">' + esc(t) + '</span>'; });
    $('#tickerTrack').innerHTML = half + half;
  }
  function renderCatChips() {
    var html = '';
    MENU.forEach(function (sec) { html += '<button class="cat-chip" data-cat="cat-' + sec.id + '">' + esc(sec.name) + '</button>'; });
    $('#catChips').innerHTML = html;
  }
  var STATION_POS = [0, 33.33, 66.66, 100];
  function renderStations() {
    var html = '';
    TRACKS[trackerMode].stations.forEach(function (s, i) {
      html += '<div class="station" data-i="' + i + '" style="left:' + STATION_POS[i] + '%"><span class="st-dot"></span>'
        + '<span class="st-label">' + esc(s.label) + '<span class="st-sub">' + esc(s.sub) + '</span></span></div>';
    });
    $('#stations').innerHTML = html;
  }
  function setTrackerMode(m) {
    trackerMode = m === 'abholung' ? 'abholung' : 'lieferung';
    renderStations();
  }
  /* ---------- Blitz-Tracker ---------- */
  var trackerRAF = null, trackerPos = 0, trackerRunning = false, trackerTimers = [];
  var trackerEtaText = '';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function stopTracker() { if (trackerRAF) { cancelAnimationFrame(trackerRAF); trackerRAF = null; } }
  function clearTrackerTimers() { trackerTimers.forEach(clearTimeout); trackerTimers = []; }
  function updateTracker(pos) {
    trackerPos = pos;
    $('#railFill').style.width = pos + '%';
    $('#railToken').style.left = pos + '%';
    var step = pos >= 99 ? 3 : pos >= 66 ? 2 : pos >= 33 ? 1 : 0;
    $$('#stations .station').forEach(function (st) {
      var i = +st.getAttribute('data-i');
      st.classList.toggle('done', pos >= STATION_POS[i] - 0.5);
    });
    var t = TRACKS[trackerMode], idle = pos === 0 && !trackerRunning;
    $('#statusTitle').textContent = idle ? 'Bereit für die Demo' : t.titles[step];
    $('#statusText').textContent = idle ? 'Klick auf „Demo starten", um den Blitz auf die Reise zu schicken.' : t.texts[step];
    $('#statusEta').textContent = (trackerRunning && pos < 99) ? trackerEtaText : '';
    $('#statusDot').style.background = trackerRunning ? '#3fa653' : (pos >= 100 ? '#d93a2b' : '#a39c8f');
  }
  function setTrackerEta() {
    var cfg = TRACKS[trackerMode], d = new Date(Date.now() + cfg.etaMin * 60000);
    var hh = d.getHours(), mm = d.getMinutes();
    trackerEtaText = cfg.etaLabel + ': ca. ' + hh + ':' + (mm < 10 ? '0' : '') + mm + ' Uhr';
  }
  // Ein Segment (from→to) weich animieren, dann Callback
  function animateSegment(from, to, dur, done) {
    if (reduceMotion) { updateTracker(to); if (done) done(); return; }
    var start = performance.now();
    (function tick(now) {
      var p = Math.min(1, (now - start) / dur);
      var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // easeInOutQuad
      updateTracker(from + (to - from) * e);
      if (p < 1) trackerRAF = requestAnimationFrame(tick);
      else { trackerRAF = null; if (done) done(); }
    })(start);
  }
  function startTracker() {
    if (trackerRunning) return;
    stopTracker(); clearTrackerTimers();
    trackerRunning = true;
    setTrackerEta();
    $('#trackerBtn').textContent = 'Läuft …';
    updateTracker(0);
    var seg = 0;
    function nextSeg() {
      if (seg >= 3) {
        trackerRunning = false;
        updateTracker(100);
        $('#trackerBtn').textContent = 'Nochmal abspielen';
        return;
      }
      var from = seg === 0 ? 0 : STATION_POS[seg];
      animateSegment(from, STATION_POS[seg + 1], reduceMotion ? 0 : 1500, function () {
        seg++;
        trackerTimers.push(setTimeout(nextSeg, reduceMotion ? 700 : 2000)); // Verweildauer an der Station
      });
    }
    trackerTimers.push(setTimeout(nextSeg, 500));
  }
  // Tracker für eine echte, bezahlte Bestellung starten
  function startTrackerForOrder(oid, mode) {
    setTrackerMode(mode);
    var badge = $('#trackerOrderNo');
    if (oid) { badge.textContent = 'Bestellung ' + oid; badge.hidden = false; } else { badge.hidden = true; }
    trackerRunning = false; stopTracker(); clearTrackerTimers();
    trackerPos = 0; updateTracker(0);
    startTracker();
  }

  /* ---------- Mobile nav ---------- */
  function openNav() { document.body.classList.add('nav-open'); $('#navToggle').setAttribute('aria-expanded', 'true'); $('#mobileNav').setAttribute('aria-hidden', 'false'); $('#scrim').hidden = false; }
  function closeNav() { document.body.classList.remove('nav-open'); $('#navToggle').setAttribute('aria-expanded', 'false'); $('#mobileNav').setAttribute('aria-hidden', 'true'); $('#scrim').hidden = true; }

  /* ---------- Wire up events ---------- */
  function bindEvents() {
    // add-to-cart (menu + highlights) + Größenwahl via delegation
    document.addEventListener('click', function (e) {
      var add = e.target.closest('[data-add]'); if (add) { addToCart(add.getAttribute('data-add')); return; }
      var so = e.target.closest('.size-opt'); if (so && pendingSizeId) { addKey(pendingSizeId + '|' + so.getAttribute('data-size')); closeSizeModal(); return; }
      var inc = e.target.closest('[data-inc]'); if (inc) { changeQty(inc.getAttribute('data-inc'), 1); return; }
      var dec = e.target.closest('[data-dec]'); if (dec) { changeQty(dec.getAttribute('data-dec'), -1); return; }
      var cat = e.target.closest('[data-cat]'); if (cat) { var el = document.getElementById(cat.getAttribute('data-cat')); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: 'smooth' }); return; }
      var view = e.target.closest('[data-view]'); if (view) { openProductModal(view.getAttribute('data-view')); return; }
    });
    $('#sizeCancel').addEventListener('click', closeSizeModal);
    $('#sizeBackdrop').addEventListener('click', closeSizeModal);

    // Produkt-Detail
    $('#productImg').onerror = function () { this.onerror = null; this.src = 'assets/menu/placeholder.png'; };
    $('#productClose').addEventListener('click', closeProductModal);
    $('#productBackdrop').addEventListener('click', closeProductModal);
    $('#productAddBtn').addEventListener('click', function () {
      if (!pendingViewId) return;
      var id = pendingViewId;
      closeProductModal();
      addToCart(id);
    });

    // diet filters
    $$('#dietFilters .chip').forEach(function (c) {
      c.addEventListener('click', function () {
        $$('#dietFilters .chip').forEach(function (x) { x.classList.remove('is-active'); });
        c.classList.add('is-active'); currentDiet = c.getAttribute('data-diet'); renderMenu();
      });
    });
    // search
    $('#menuSearch').addEventListener('input', function (e) { currentSearch = e.target.value.trim().toLowerCase(); renderMenu(); });

    // cart open/close
    $('#cartFab').addEventListener('click', openCart);
    $('#cartClose').addEventListener('click', closeCart);
    $('#scrim').addEventListener('click', function () { closeCart(); closeNav(); });
    // mode toggle
    $$('#cartDrawer .mode-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('#cartDrawer .mode-btn').forEach(function (x) { x.classList.remove('is-active'); });
        b.classList.add('is-active'); mode = b.getAttribute('data-mode'); renderCart();
      });
    });
    // checkout → Kasse-Modal öffnen
    $('#checkoutBtn').addEventListener('click', function () {
      if (this.disabled) return;
      openCheckout();
    });
    $('#checkoutClose').addEventListener('click', closeCheckout);
    $('#checkoutBackdrop').addEventListener('click', closeCheckout);
    $('#checkoutForm').addEventListener('submit', submitCheckout);
    $('#confirmClose').addEventListener('click', closeConfirm);
    $('#confirmBackdrop').addEventListener('click', closeConfirm);

    // tracker
    $('#trackerBtn').addEventListener('click', function () {
      if (trackerRunning) return;
      setTrackerMode(mode);            // Demo im aktuell gewählten Modus (Lieferung/Abholung)
      $('#trackerOrderNo').hidden = true;
      trackerPos = 0; updateTracker(0);
      startTracker();
    });

    // contact form
    $('#contactForm').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!this.checkValidity()) { this.reportValidity(); return; }
      $('#formSuccess').hidden = false; this.reset();
    });

    // mobile nav
    $('#navToggle').addEventListener('click', function () { document.body.classList.contains('nav-open') ? closeNav() : openNav(); });
    $$('#mobileNav a').forEach(function (a) { a.addEventListener('click', closeNav); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeNav(); closeCart(); closeSizeModal(); closeProductModal(); closeCheckout(); closeConfirm(); } });

    // header shadow
    var header = $('#siteHeader');
    window.addEventListener('scroll', function () { header.classList.toggle('scrolled', window.scrollY > 8); }, { passive: true });
  }

  /* ---------- Active nav highlighting ---------- */
  function initScrollSpy() {
    var links = {}; $$('.nav-desktop .nav-link').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var secs = $$('main section[id]');
    if (!('IntersectionObserver' in window)) return;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove('active'); });
          if (links[en.target.id]) links[en.target.id].classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(function (s) { obs.observe(s); });
  }

  /* ---------- Count-up stats ---------- */
  function countUp(el) {
    var to = parseFloat(el.getAttribute('data-to')), dec = +(el.getAttribute('data-decimals') || 0),
        suf = el.getAttribute('data-suffix') || '', start = performance.now(), dur = 1400;
    (function step(now) {
      var t = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - t, 3), v = to * e;
      el.textContent = (dec ? v.toFixed(dec).replace('.', ',') : Math.round(v)) + suf;
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }

  /* ---------- GSAP animations ---------- */
  function initAnimations() {
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!window.gsap || !window.ScrollTrigger || reduce) {
      // Fallback: just count up stats when visible, no motion
      $$('.stat-num').forEach(function (el) { countUp(el); });
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    // hero pizza: leichtes Kippen + Zoom beim Wegscrollen (kein Hover — auf dem Handy sonst keine Animation)
    var heroPizza = $('#heroPizza');
    if (heroPizza) {
      gsap.to(heroPizza, {
        rotation: 14, scale: 1.09, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 }
      });
    }

    // reveals
    $$('.reveal').forEach(function (el) {
      gsap.from(el, {
        opacity: 0, y: 28, duration: 0.7, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 86%' }
      });
    });
    // staggered menu / grid children where several .reveal siblings exist -> handled individually above (fine)

    // stats count-up on enter
    ScrollTrigger.create({
      trigger: '#stats', start: 'top 85%', once: true,
      onEnter: function () { $$('.stat-num').forEach(function (el) { countUp(el); }); }
    });

    // rotate highlight pizzas on scroll
    $$('.hl-pizza').forEach(function (p) {
      var dir = +(p.getAttribute('data-rot') || 1);
      gsap.to(p, {
        rotation: 360 * dir, ease: 'none',
        scrollTrigger: { trigger: '#highlights', start: 'top bottom', end: 'bottom top', scrub: 1 }
      });
    });

    // steps connector line draw
    var line = $('.steps-line path');
    if (line) {
      gsap.to(line, { strokeDashoffset: 0, ease: 'none',
        scrollTrigger: { trigger: '.steps', start: 'top 75%', end: 'bottom 60%', scrub: true } });
    }

    ScrollTrigger.refresh();
  }

  /* ---------- Init ---------- */
  function init() {
    $('#year').textContent = new Date().getFullYear();
    renderHighlights();
    renderCatChips();
    renderMenu();
    renderAllergenLegend();
    renderReviews();
    renderTicker();
    renderStations();
    updateTracker(0);
    renderCart();
    bindEvents();
    initScrollSpy();
    initAnimations();
    handleOrderReturn();
  }

  // Bestätigungs-Screen nach erfolgreicher Zahlung
  var paidOid = '', paidMode = 'lieferung';
  function openConfirm(oid) {
    paidOid = oid || ''; paidMode = 'lieferung';
    $('#confirmOid').textContent = oid || '—';
    $('#confirmModeLabel').textContent = 'Gesamt';
    $('#confirmTotal').textContent = '—';
    $('#confirmStatus').textContent = 'bezahlt';
    $('#confirmBackdrop').hidden = false;
    $('#confirmModal').setAttribute('aria-hidden', 'false');
    // Details live nachladen (Betrag, Modus, Status)
    if (oid) {
      fetch(ORDER_API + '/order/' + encodeURIComponent(oid))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d && d.mode) paidMode = d.mode === 'lieferung' ? 'lieferung' : 'abholung';
          if (d && typeof d.total === 'number') {
            $('#confirmModeLabel').textContent = d.mode === 'lieferung' ? 'Lieferung' : 'Abholung';
            $('#confirmTotal').textContent = fmt(d.total);
          }
          if (d && d.status) $('#confirmStatus').textContent = d.status === 'paid' ? 'bezahlt' : d.status;
        })
        .catch(function () {});
    }
  }
  function closeConfirm() {
    if ($('#confirmModal').getAttribute('aria-hidden') === 'true') return;
    $('#confirmBackdrop').hidden = true;
    $('#confirmModal').setAttribute('aria-hidden', 'true');
    // Blitz-Tracker mit der echten Bestellung starten und hinscrollen
    var el = $('#tracker');
    if (el) {
      $('#trackerSub').textContent = 'Verfolge deine Bestellung live.';
      startTrackerForOrder(paidOid, paidMode);
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Rückkehr von Stripe: ?bestellung=ok (bezahlt) / =abbruch
  function handleOrderReturn() {
    var p = new URLSearchParams(location.search);
    var b = p.get('bestellung');
    if (!b) return;
    if (b === 'ok') {
      cart = {}; saveCart(); renderCart(); closeCart(); closeCheckout();
      openConfirm(p.get('oid') || '');
    } else if (b === 'abbruch') {
      // Warenkorb bleibt erhalten – Kasse wieder öffnen, falls noch was drin ist
      if (cartCount() > 0) { openCart(); }
    }
    history.replaceState(null, '', location.pathname);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
