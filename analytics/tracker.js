/**
 * Portfolio Analytics Tracker – DSGVO-konform
 * Trackt nur nach expliziter Einwilligung (TTDSG §25, DSGVO Art. 6 Abs. 1 lit. a).
 */

(function () {
  var WORKER_URL = 'https://portfolio-analytics.seyle450.workers.dev';
  var CONSENT_KEY = 'analytics_consent';

  // ── Consent ──────────────────────────────────────────────────────────────
  function getConsent()    { try { return localStorage.getItem(CONSENT_KEY); } catch(e) { return null; } }
  function setConsent(val) { try { localStorage.setItem(CONSENT_KEY, val); }  catch(e) {} }
  function hasConsent()    { return getConsent() === 'granted'; }
  function isDenied()      { return getConsent() === 'denied'; }

  // ── Site-Erkennung für Datenschutz-Link ──────────────────────────────────
  function getSiteKey() {
    var p = location.pathname.toLowerCase();
    if (p.includes('starscape'))  return 'starscape';
    if (p.includes("ben"))        return 'bens';
    if (p.includes("hevi"))       return 'hevis';
    if (p.includes("niki"))       return 'cafeniki';
    if (p.includes("lokma"))      return 'lokma';
    if (p.includes("antepli"))    return 'antepli';
    if (p.includes("freelance"))  return 'freelance';
    return '';
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
      var own = ['seyle450.github.io', location.hostname, 'localhost', '127.0.0.1'];
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
    var currentPage = location.pathname + location.search;
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
      utm: utm || undefined,
    });
  }

  function onLeave() {
    if (!hasConsent()) return;
    var page = sessionStorage.getItem('_pp');
    var start = getLastPageStart();
    if (page && start > 0) sendDuration(page, Date.now() - start);
  }

  // ── Consent-Banner ───────────────────────────────────────────────────────
  function injectBanner() {
    if (document.getElementById('_acb')) return;

    var css = [
      '@keyframes _acb-up{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}',

      /* Wrapper */
      '#_acb{',
        'position:fixed;bottom:0;left:0;right:0;z-index:2147483647;',
        'background:var(--acb-bg,#fff);',
        'border-top:1px solid var(--acb-border,rgba(0,0,0,.07));',
        'border-radius:var(--acb-radius,14px 14px 0 0);',
        'box-shadow:var(--acb-shadow,0 -8px 48px rgba(0,0,0,.12));',
        'font-family:var(--acb-font,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif);',
        'font-size:var(--acb-size,.875rem);',
        'color:var(--acb-text,#1e293b);',
        'line-height:1.55;',
        'animation:_acb-up .4s cubic-bezier(.16,1,.3,1) .3s both;',
      '}',

      /* Inner layout */
      '#_acb-in{',
        'display:flex;align-items:center;gap:1.25rem;',
        'max-width:960px;margin:0 auto;',
        'padding:1.1rem 1.5rem;',
        'flex-wrap:wrap;',
      '}',

      /* Icon */
      '#_acb-ico{',
        'flex-shrink:0;width:36px;height:36px;border-radius:10px;',
        'background:var(--acb-accent-soft,rgba(99,102,241,.1));',
        'display:flex;align-items:center;justify-content:center;',
        'color:var(--acb-accent,#6366f1);',
      '}',
      '#_acb-ico svg{width:18px;height:18px;}',

      /* Text block */
      '#_acb-txt{flex:1;min-width:200px;}',
      '#_acb-ttl{font-weight:700;font-size:var(--acb-ttl-size,.92rem);margin-bottom:.2rem;color:var(--acb-text,#1e293b);}',
      '#_acb-sub{color:var(--acb-sub,#64748b);font-size:calc(var(--acb-size,.875rem) * .92);}',
      '#_acb-sub a{color:var(--acb-accent,#6366f1);text-decoration:underline;text-underline-offset:2px;}',
      '#_acb-sub a:hover{opacity:.8;}',

      /* Buttons */
      '#_acb-btns{display:flex;gap:.5rem;flex-shrink:0;}',
      '#_acb-btns button{',
        'padding:.55rem 1.15rem;border:none;cursor:pointer;font-family:inherit;',
        'font-size:calc(var(--acb-size,.875rem) * .9);font-weight:600;',
        'border-radius:var(--acb-btn-r,8px);transition:all .15s;',
        'white-space:nowrap;',
      '}',
      '#_acbdeny{',
        'background:var(--acb-deny-bg,#f1f5f9);',
        'color:var(--acb-deny-text,#475569);',
      '}',
      '#_acbdeny:hover{background:var(--acb-deny-hover,#e2e8f0);}',
      '#_acbaccept{',
        'background:var(--acb-accent,#6366f1);',
        'color:var(--acb-accent-fg,#fff);',
      '}',
      '#_acbaccept:hover{opacity:.88;}',

      /* Mobile */
      '@media(max-width:560px){',
        '#_acb-in{padding:.9rem 1rem;gap:.8rem;}',
        '#_acb-ico{display:none;}',
        '#_acb-btns{width:100%;justify-content:stretch;}',
        '#_acb-btns button{flex:1;text-align:center;}',
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
    banner.setAttribute('aria-label', 'Cookie-Einwilligung');
    banner.innerHTML = [
      '<div id="_acb-in">',
        '<div id="_acb-ico">',
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
            '<path d="M12 2a10 10 0 1 0 10 10"/>',
            '<path d="M12 6v6l4 2"/>',
            '<circle cx="18" cy="6" r="3" fill="currentColor" stroke="none"/>',
          '</svg>',
        '</div>',
        '<div id="_acb-txt">',
          '<div id="_acb-ttl">Anonyme Website-Analyse</div>',
          '<div id="_acb-sub">',
            'Ich nutze eigene, datenschutzfreundliche Analyse-Tools — keine Drittanbieter, keine Werbung. ',
            '<a href="' + dUrl + '" target="_blank">Datenschutzerklärung&nbsp;→</a>',
          '</div>',
        '</div>',
        '<div id="_acb-btns">',
          '<button id="_acbdeny">Ablehnen</button>',
          '<button id="_acbaccept">Akzeptieren</button>',
        '</div>',
      '</div>',
    ].join('');
    document.body.appendChild(banner);

    document.getElementById('_acbaccept').onclick = function () {
      setConsent('granted');
      banner.style.animation = 'none';
      banner.style.transition = 'transform .25s ease,opacity .25s ease';
      banner.style.transform = 'translateY(100%)';
      banner.style.opacity = '0';
      setTimeout(function () { banner.remove(); style.remove(); }, 280);
      track();
    };
    document.getElementById('_acbdeny').onclick = function () {
      setConsent('denied');
      banner.style.animation = 'none';
      banner.style.transition = 'transform .25s ease,opacity .25s ease';
      banner.style.transform = 'translateY(100%)';
      banner.style.opacity = '0';
      setTimeout(function () { banner.remove(); style.remove(); }, 280);
    };
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  function init() {
    if (isDenied()) return;
    if (hasConsent()) {
      track();
    } else {
      if (document.body) injectBanner();
      else document.addEventListener('DOMContentLoaded', injectBanner);
    }
    window.addEventListener('beforeunload', onLeave);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') onLeave();
    });
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
