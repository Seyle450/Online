/**
 * Portfolio Analytics Tracker – DSGVO-konform
 * Trackt nur nach expliziter Einwilligung (TTDSG §25, DSGVO Art. 6 Abs. 1 lit. a).
 */

(function () {
  var WORKER_URL = 'https://portfolio-analytics.seyle450.workers.dev';
  var CONSENT_KEY = 'analytics_consent';

  // ── Lokale Entwicklung / Vorschau NIE tracken ──────────────────────────────
  // VS Code Live Preview (127.0.0.1 + ?vscode-livepreview), localhost, Live
  // Server u. Ä. sollen die echte Statistik nicht verfälschen → hier aussteigen.
  var _host = location.hostname;
  if (_host === 'localhost' || _host === '127.0.0.1' || _host === '0.0.0.0' ||
      _host === '[::1]' || _host === '' || /\.local$/.test(_host) ||
      location.search.indexOf('vscode-livepreview') > -1) {
    return;
  }

  // ── Eigene / Test-Geräte dauerhaft vom Tracking ausnehmen ──────────────────
  // Einmal irgendeine Seite mit  ?notrack=1  aufrufen → dieses Gerät wird ab dann
  // auf ALLEN elyesferchichi-(Sub)domains NIE mehr gezählt (auch nicht anonym).
  // Gespeichert als Cookie auf der Hauptdomain, gilt daher überall. Rückgängig
  // mit  ?notrack=0 .
  try {
    var _q = location.search;
    var _parts = location.hostname.split('.');
    var _dom = _parts.length >= 2 ? '.' + _parts.slice(-2).join('.') : location.hostname;
    var _sec = location.protocol === 'https:' ? '; Secure' : '';
    if (_q.indexOf('notrack=1') > -1) {
      document.cookie = '_notrack=1; max-age=' + (60 * 60 * 24 * 3650) + '; domain=' + _dom + '; path=/; SameSite=Lax' + _sec;
      try { localStorage.setItem('_notrack', '1'); } catch (e) {}
    }
    if (_q.indexOf('notrack=0') > -1) {
      document.cookie = '_notrack=; max-age=0; domain=' + _dom + '; path=/; SameSite=Lax' + _sec;
      try { localStorage.removeItem('_notrack'); } catch (e) {}
    }
    var _nt = document.cookie.indexOf('_notrack=1') > -1;
    try { if (localStorage.getItem('_notrack') === '1') _nt = true; } catch (e) {}
    if (_nt) return; // Tracker komplett aus
  } catch (e) {}

  // ── Consent (cookie with parent domain so all subdomains share it) ────────
  function cookieDomain() {
    var h = location.hostname;
    // extract root domain: antepli.elyesferchichi.com → .elyesferchichi.com
    var parts = h.split('.');
    return parts.length >= 2 ? '.' + parts.slice(-2).join('.') : h;
  }
  function getConsent() {
    try {
      var m = document.cookie.match('(?:^|;)\\s*' + CONSENT_KEY + '=([^;]+)');
      return m ? decodeURIComponent(m[1]) : null;
    } catch(e) { return null; }
  }
  function setConsent(val) {
    try {
      var age = 60 * 60 * 24 * 365;
      document.cookie = CONSENT_KEY + '=' + encodeURIComponent(val) +
        '; max-age=' + age + '; domain=' + cookieDomain() +
        '; path=/; SameSite=Lax' +
        (location.protocol === 'https:' ? '; Secure' : '');
      // also keep localStorage as fallback for localhost
      localStorage.setItem(CONSENT_KEY, val);
    } catch(e) {}
  }
  function hasConsent()    { return getConsent() === 'granted'; }
  function isDenied()      { return getConsent() === 'denied'; }

  // ── Site-Erkennung für Datenschutz-Link ──────────────────────────────────
  function getSiteKey() {
    var h = location.hostname.toLowerCase();
    var p = location.pathname.toLowerCase();
    if ((h.includes('pizza') && h.includes('blitz')) || p.includes('pizza%20blitz') || p.includes('pizza blitz') || p.includes('pizza-blitz')) return 'pizza-blitz';
    if (h.includes('hochzeit')  || p.includes('hochzeit'))  return 'hochzeit';
    if (h.includes('antepli')   || p.includes('antepli'))   return 'antepli';
    if (h.includes('hevis')     || p.includes('hevi'))      return 'hevis';
    if (h.includes('bens')      || p.includes('/bens') || p.includes("ben's")) return 'bens';
    if (h.includes('niki')      || p.includes('niki'))      return 'cafeniki';
    if (h.includes('lokma')     || p.includes('lokma'))     return 'lokma';
    if (h.includes('starscape') || p.includes('starscape')) return 'starscape';
    if (p.includes('freelance'))                            return 'freelance';
    if (p.includes('cafe-petit') || p.includes('café-petit')) return 'cafe-petit';
    if (p.includes('coffee-corner'))                        return 'coffee-corner';
    if (p.includes('dilan'))                                return 'dilans';
    if (p.includes('farfalla'))                             return 'farfalla';
    if (p.includes('habitat'))                              return 'habitat';
    if (p.includes('olymp'))                                return 'kleiner-olymp';
    if (p.includes('halmerweg') || p.includes('grundschule')) return 'grundschule';
    if (p.includes('/bay'))                                 return 'bay';
    return '';
  }

  // Mandant/Site-Slug für die Analytics-Trennung: wie getSiteKey, aber liefert für
  // die Hauptseite (kein Projekt-Match) den Default 'elyesferchichi' statt ''.
  // Muss zu den Slugs in ../worker/auth-config.js passen.
  function getSite() {
    return getSiteKey() || 'elyesferchichi';
  }

  function datenschutzUrl() {
    var key = getSiteKey();
    return 'https://elyesferchichi.com/datenschutz.html' + (key ? '?site=' + key : '');
  }

  // ── Canvas-Fingerprint ───────────────────────────────────────────────────
  function canvasFingerprint() {
    try {
      var c = document.createElement('canvas');
      var ctx = c.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Tracker', 2, 2);
      return c.toDataURL().slice(-20);
    } catch(e) { return 'nc'; }
  }

  function getVisitorId() {
    var parts = [
      canvasFingerprint(),
      screen.width + 'x' + screen.height,
      navigator.language || '',
      (Intl.DateTimeFormat().resolvedOptions().timeZone) || '',
      navigator.hardwareConcurrency || '',
    ].join('|');
    var h = 2166136261;
    for (var i = 0; i < parts.length; i++) {
      h ^= parts.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  // ── Session ───────────────────────────────────────────────────────────────
  var XTS_KEY = '_xts'; // Cross-tab session state in localStorage
  var XTS_TTL = 30 * 60 * 1000; // 30 min

  function getCrossTabState() {
    try {
      var s = JSON.parse(localStorage.getItem(XTS_KEY) || '{}');
      if (s.sid && s.ts && (Date.now() - s.ts) < XTS_TTL) return s;
    } catch(e) {}
    return null;
  }
  function setCrossTabState(sid, pageCount) {
    try { localStorage.setItem(XTS_KEY, JSON.stringify({ sid: sid, ts: Date.now(), pages: pageCount })); } catch(e) {}
  }

  function getSessionId() {
    var k = '_as', sid = sessionStorage.getItem(k);
    if (!sid) {
      // New tab: check if referrer is our own site → reuse session
      var ref = document.referrer;
      // 'elyesferchichi.com' is a substring of all subdomains, so one entry covers all
      var own = ['elyesferchichi.com', 'seyle450.github.io', 'localhost', '127.0.0.1'];
      var fromOwnSite = ref && own.some(function(h){ return ref.includes(h); });
      if (fromOwnSite) {
        var state = getCrossTabState();
        if (state) {
          sid = state.sid;
          sessionStorage.setItem(k, sid);
          if (state.pages) sessionStorage.setItem('_api', String(state.pages));
        }
      }
      if (!sid) { sid = Math.random().toString(36).slice(2) + Date.now().toString(36); }
      sessionStorage.setItem(k, sid);
    }
    return sid;
  }
  function getSessionPageIndex() {
    var k = '_api', n = parseInt(sessionStorage.getItem(k) || '0', 10) + 1;
    sessionStorage.setItem(k, String(n)); return n;
  }
  function getPreviousPage() { return sessionStorage.getItem('_pp') || ''; }
  function setCurrentPage(p) { sessionStorage.setItem('_pp', p); }
  function getLastPageStart() { return parseInt(sessionStorage.getItem('_ps') || '0', 10); }
  function setPageStart(ts)   { sessionStorage.setItem('_ps', String(ts)); }

  function getUtmParams() {
    var params = new URLSearchParams(location.search);
    var UTM_KEYS = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
    var hasUtm = UTM_KEYS.some(function(k){ return params.has(k); });
    if (hasUtm) {
      var utm = {
        source:   params.get('utm_source')   || '',
        medium:   params.get('utm_medium')   || '',
        campaign: params.get('utm_campaign') || '',
        content:  params.get('utm_content')  || '',
        term:     params.get('utm_term')     || '',
      };
      try { sessionStorage.setItem('_utm', JSON.stringify(utm)); } catch(e) {}
      return utm;
    }
    try { var s = sessionStorage.getItem('_utm'); if (s) return JSON.parse(s); } catch(e) {}
    return null;
  }

  // ── Events senden ────────────────────────────────────────────────────────
  function sendEvent(payload) {
    fetch(WORKER_URL + '/track', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), keepalive: true,
    }).catch(function () {});
  }
  function sendDuration(page, durationMs) {
    if (!page || durationMs < 1000) return;
    fetch(WORKER_URL + '/duration', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: page, durationMs: durationMs, sessionId: getSessionId(), visitorId: getVisitorId(), timestamp: Date.now() }),
      keepalive: true,
    }).catch(function () {});
  }

  function track() {
    if (!hasConsent()) return;
    var now = Date.now();
    var mainHosts = ['elyesferchichi.com', 'seyle450.github.io', 'localhost', '127.0.0.1'];
    var isMain = mainHosts.some(function(h){ return location.hostname === h; });
    var currentPage = (isMain ? '' : location.hostname) + location.pathname + location.search;
    var previousPage = getPreviousPage();
    var lastStart = getLastPageStart();
    if (previousPage && lastStart > 0) sendDuration(previousPage, now - lastStart);
    setPageStart(now);
    setCurrentPage(currentPage);
    var sid = getSessionId();
    var pageIdx = getSessionPageIndex();
    setCrossTabState(sid, pageIdx);
    var utm = getUtmParams();
    sendEvent({
      page: currentPage, previousPage: previousPage,
      pageIndex: pageIdx, referrer: document.referrer || '',
      userAgent: navigator.userAgent, screenWidth: screen.width,
      language: navigator.language || '', timestamp: now,
      sessionId: sid, visitorId: getVisitorId(),
      site: getSite(),
      utm: utm || undefined,
    });
  }

  // ── Anonymer Ping (ohne Einwilligung) ─────────────────────────────────────
  // Sendet KEINE personenbezogenen Daten: keine visitorId, kein Fingerprint,
  // keine Session, kein gespeicherter User-Agent. Es wird bewusst NICHTS auf dem
  // Gerät gespeichert oder ausgelesen (kein Cookie, kein Storage), damit §25
  // TDDDG (ehem. TTDSG) für Nicht-Einwilliger nicht greift. Übertragen wird nur
  // der Seitenname + Referrer; Land/Gerät/Browser/Sprache leitet der Server aus
  // den ohnehin gesendeten HTTP-Headern ab und speichert daraus ausschließlich
  // anonyme Tages-Aggregate (reine Zähler, keine Personen-Wiedererkennung).
  function anonPage() {
    var mainHosts = ['elyesferchichi.com', 'seyle450.github.io', 'localhost', '127.0.0.1'];
    var isMain = mainHosts.some(function (h) { return location.hostname === h; });
    return (isMain ? '' : location.hostname) + location.pathname;
  }
  function sendAnonVisit() {
    fetch(WORKER_URL + '/visit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: anonPage(), referrer: document.referrer || '' }),
      keepalive: true,
    }).catch(function () {});
  }
  // Anonymes Klick-Zählen: nur das Label (z. B. "WhatsApp"), kein ID/Session.
  function sendAnonClick(label) {
    fetch(WORKER_URL + '/visit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: anonPage(), click: label }), keepalive: true,
    }).catch(function () {});
  }

  function onLeave() {
    if (!hasConsent()) return;
    var page = sessionStorage.getItem('_pp');
    var start = getLastPageStart();
    if (page && start > 0) sendDuration(page, Date.now() - start);
  }

  // ── Klick-Tracking (was gedrückt wurde) ──────────────────────────────────
  function clickLabel(el) {
    var dt = el.getAttribute('data-track');
    if (dt) return dt.slice(0, 80);
    var href = el.getAttribute('href') || '';
    if (/wa\.me|whatsapp/i.test(href))  return 'WhatsApp';
    if (/^mailto:/i.test(href))         return 'E-Mail: ' + href.replace(/^mailto:/i, '').split('?')[0];
    if (/^tel:/i.test(href))            return 'Anruf: ' + href.replace(/^tel:/i, '');
    var text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);
    if (text) return text;
    var aria = el.getAttribute('aria-label');
    if (aria) return aria.slice(0, 80);
    return href ? href.slice(0, 80) : 'Klick';
  }

  function clickCategory(el) {
    var href = el.getAttribute('href') || '';
    if (/wa\.me|whatsapp/i.test(href)) return 'whatsapp';
    if (/^mailto:/i.test(href))        return 'email';
    if (/^tel:/i.test(href))           return 'phone';
    if (/^#/.test(href))               return 'anchor';
    if (el.tagName === 'BUTTON')       return 'button';
    if (href) {
      try {
        var host = new URL(href, location.href).hostname;
        if (host && host !== location.hostname) return 'external';
      } catch (e) {}
    }
    return 'link';
  }

  function sendClick(label, category, href) {
    var mainHosts = ['elyesferchichi.com', 'seyle450.github.io', 'localhost', '127.0.0.1'];
    var isMain = mainHosts.some(function (h) { return location.hostname === h; });
    var page = (isMain ? '' : location.hostname) + location.pathname;
    fetch(WORKER_URL + '/event', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'click', label: label, category: category,
        href: (href || '').slice(0, 200), page: page, site: getSite(),
        sessionId: getSessionId(), visitorId: getVisitorId(), timestamp: Date.now(),
      }),
      keepalive: true,
    }).catch(function () {});
  }

  function onClick(ev) {
    var el = ev.target.closest('a, button, [data-track]');
    if (!el) return;
    if (el.closest('#_acb')) return; // Consent-Banner ignorieren
    var label = clickLabel(el);
    if (hasConsent()) {
      sendClick(label, clickCategory(el), el.getAttribute('href') || '');
    } else {
      sendAnonClick(label); // anonym, nur Label – keine ID/Session
    }
  }

  // ── Scroll-Tiefe (25/50/75/100 %) ────────────────────────────────────────
  var _scrollFired = {};
  function sendScroll(depth) {
    var mainHosts = ['elyesferchichi.com', 'seyle450.github.io', 'localhost', '127.0.0.1'];
    var isMain = mainHosts.some(function (h) { return location.hostname === h; });
    var page = (isMain ? '' : location.hostname) + location.pathname;
    fetch(WORKER_URL + '/event', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'scroll', category: 'scroll', depth: depth,
        label: 'Scroll ' + depth + '%', page: page, site: getSite(),
        sessionId: getSessionId(), visitorId: getVisitorId(), timestamp: Date.now(),
      }),
      keepalive: true,
    }).catch(function () {});
  }
  function onScroll() {
    if (!hasConsent()) return;
    var doc = document.documentElement;
    var scrollable = doc.scrollHeight - doc.clientHeight;
    if (scrollable < 200) return; // sehr kurze Seiten ignorieren
    var pct = (doc.scrollTop || document.body.scrollTop) / scrollable * 100;
    [25, 50, 75, 100].forEach(function (m) {
      if (pct >= m && !_scrollFired[m]) { _scrollFired[m] = true; sendScroll(m); }
    });
  }

  // ── Consent-Banner ───────────────────────────────────────────────────────
  function injectBanner() {
    if (document.getElementById('_acb')) return;

    var css = [
      '@keyframes _acb-up{from{transform:translate(-50%,22px) scale(.97);opacity:0}to{transform:translate(-50%,0) scale(1);opacity:1}}',
      '@keyframes _acb-shine{0%,55%{left:-140%}78%,100%{left:170%}}',

      /* schwebende Karte, mittig unten */
      '#_acb{',
        'position:fixed;z-index:2147483647;',
        'left:50%;bottom:clamp(14px,3vw,30px);transform:translateX(-50%);',
        'width:calc(100% - 32px);max-width:452px;',
        'font-family:var(--acb-font,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif);',
        'animation:_acb-up .55s cubic-bezier(.16,1,.3,1) .25s both;',
      '}',
      '#_acb-card{',
        'position:relative;overflow:hidden;',
        'background:var(--acb-bg,#fff);',
        'border:1px solid var(--acb-border,rgba(0,0,0,.08));',
        'border-radius:var(--acb-radius,20px);',
        'box-shadow:var(--acb-shadow,0 18px 54px -12px rgba(0,0,0,.30));',
        'padding:1.3rem 1.35rem 1.2rem;',
        'color:var(--acb-text,#1e293b);line-height:1.5;font-size:.9rem;',
      '}',
      /* dezenter Akzent-Schein oben rechts */
      '#_acb-card::before{content:"";position:absolute;top:-45%;right:-12%;width:60%;height:130%;pointer-events:none;background:radial-gradient(circle, var(--acb-accent-soft,rgba(99,102,241,.18)), transparent 68%);}',

      '#_acb-head{display:flex;align-items:center;gap:.7rem;position:relative;}',
      '#_acb-ico{flex-shrink:0;width:40px;height:40px;border-radius:12px;background:var(--acb-accent-soft,rgba(99,102,241,.12));display:flex;align-items:center;justify-content:center;color:var(--acb-accent,#6366f1);}',
      '#_acb-ico svg{width:21px;height:21px;}',
      '#_acb-ttl{font-weight:700;font-size:1.05rem;letter-spacing:-.01em;color:var(--acb-text,#1e293b);}',

      '#_acb-sub{margin-top:.75rem;color:var(--acb-sub,#64748b);font-size:.86rem;position:relative;}',

      '#_acb-chips{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.9rem;position:relative;}',
      '#_acb-chips span{display:inline-flex;align-items:center;gap:.28rem;font-size:.72rem;font-weight:600;letter-spacing:.01em;padding:.32rem .62rem;border-radius:100px;background:var(--acb-accent-soft,rgba(99,102,241,.1));color:var(--acb-accent,#6366f1);white-space:nowrap;}',

      '#_acb-btns{display:flex;gap:.6rem;margin-top:1.15rem;position:relative;}',
      '#_acb-btns button{flex:1;padding:.72rem 1rem;border:none;cursor:pointer;font-family:inherit;font-size:.88rem;font-weight:700;border-radius:var(--acb-btn-r,12px);transition:transform .12s ease,opacity .15s ease,background .15s ease;}',
      '#_acb-btns button:active{transform:translateY(1px);}',
      '#_acbdeny{background:var(--acb-deny-bg,#f1f5f9);color:var(--acb-deny-text,#475569);}',
      '#_acbdeny:hover{background:var(--acb-deny-hover,#e2e8f0);}',
      '#_acbaccept{position:relative;overflow:hidden;background:var(--acb-accent,#6366f1);color:var(--acb-accent-fg,#fff);box-shadow:0 8px 20px -8px rgba(0,0,0,.35);}',
      '#_acbaccept:hover{opacity:.93;}',
      '#_acbaccept::after{content:"";position:absolute;top:0;left:-140%;width:55%;height:100%;background:linear-gradient(110deg,transparent,rgba(255,255,255,.38),transparent);transform:skewX(-20deg);animation:_acb-shine 3.4s ease-in-out infinite;pointer-events:none;}',

      '#_acb-foot{margin-top:.85rem;font-size:.74rem;color:var(--acb-sub,#64748b);position:relative;}',
      '#_acb-foot a{color:var(--acb-accent,#6366f1);text-decoration:underline;text-underline-offset:2px;}',
      '#_acb-foot a:hover{opacity:.8;}',

      '@media(max-width:560px){',
        '#_acb{width:calc(100% - 20px);bottom:10px;}',
        '#_acb-card{padding:1.2rem 1.15rem;}',
      '}',
      '@media(prefers-reduced-motion:reduce){',
        '#_acb{animation:none;}',
        '#_acbaccept::after{animation:none;display:none;}',
      '}',
    ].join('');

    var style = document.createElement('style');
    style.id = '_acb-style';
    style.textContent = css;
    document.head.appendChild(style);

    var dUrl = datenschutzUrl();

    var banner = document.createElement('div');
    banner.id = '_acb';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Einwilligung zur Nutzungsmessung');
    banner.innerHTML = [
      '<div id="_acb-card">',
        '<div id="_acb-head">',
          '<div id="_acb-ico">',
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
              '<path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3z"/>',
              '<path d="M9 12l2 2 4-4"/>',
            '</svg>',
          '</div>',
          '<div id="_acb-ttl">Hilfst du mir, die Seite zu verbessern?</div>',
        '</div>',
        '<div id="_acb-sub">',
          'Ich messe — <b>ohne deinen Namen oder Kontaktdaten</b> — wie meine Seite genutzt wird: welche Inhalte ankommen, woher Besucher kommen, was geklickt wird. Damit mache ich sie für dich besser. Kein Verkauf, keine Werbung, keine Weitergabe an Dritte.',
        '</div>',
        '<div id="_acb-chips">',
          '<span>✓ Ohne Name &amp; Kontakt</span>',
          '<span>✓ Keine Werbung</span>',
          '<span>✓ Keine Drittanbieter</span>',
        '</div>',
        '<div id="_acb-btns">',
          '<button id="_acbdeny">Ablehnen</button>',
          '<button id="_acbaccept">Gerne, akzeptieren</button>',
        '</div>',
        '<div id="_acb-foot">Jederzeit widerrufbar · <a href="' + dUrl + '" target="_blank">Datenschutzerklärung&nbsp;→</a></div>',
      '</div>',
    ].join('');
    document.body.appendChild(banner);

    document.getElementById('_acbaccept').onclick = function () {
      setConsent('granted');
      banner.style.animation = 'none';
      banner.style.transition = 'transform .25s ease,opacity .25s ease';
      banner.style.transform = 'translate(-50%,140%)';
      banner.style.opacity = '0';
      setTimeout(function () { banner.remove(); style.remove(); }, 280);
      track();
    };
    document.getElementById('_acbdeny').onclick = function () {
      setConsent('denied');
      banner.style.animation = 'none';
      banner.style.transition = 'transform .25s ease,opacity .25s ease';
      banner.style.transform = 'translate(-50%,140%)';
      banner.style.opacity = '0';
      setTimeout(function () { banner.remove(); style.remove(); }, 280);
    };
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  function init() {
    if (hasConsent()) {
      track();
    } else {
      // Keine Einwilligung (abgelehnt ODER unentschieden): anonym zählen
      sendAnonVisit();
      // Banner nur zeigen, solange noch keine Entscheidung getroffen wurde
      if (!isDenied()) {
        if (document.body) injectBanner();
        else document.addEventListener('DOMContentLoaded', injectBanner);
      }
    }
    // Listener für alle: onLeave/onScroll prüfen selbst auf Consent,
    // onClick zählt ohne Consent anonym (nur Label).
    window.addEventListener('beforeunload', onLeave);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') onLeave();
    });
    document.addEventListener('click', onClick, true);
    var _scrollTimer = null;
    window.addEventListener('scroll', function () {
      if (_scrollTimer) return;
      _scrollTimer = setTimeout(function () { _scrollTimer = null; onScroll(); }, 200);
    }, { passive: true });
  }

  function patchHistory(method) {
    var orig = history[method];
    history[method] = function () { orig.apply(this, arguments); track(); };
  }
  window.addEventListener('popstate', track);
  patchHistory('pushState');
  patchHistory('replaceState');

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
