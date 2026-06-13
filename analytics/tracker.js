/**
 * Portfolio Analytics Tracker
 * Kein Cookie, kein localStorage – DSGVO-freundlich.
 * Trackt: Seitenaufrufe, Session-Flow, Wiederkehrende Besucher.
 */

(function () {
  var WORKER_URL = 'https://portfolio-analytics.seyle450.workers.dev';

  // ── Canvas-Fingerprint ────────────────────────────────────────────────────
  function canvasFingerprint() {
    try {
      var c = document.createElement('canvas');
      var ctx = c.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Analytics\u{1F4CA}', 2, 2);
      return c.toDataURL().slice(-20);
    } catch (e) { return 'no-canvas'; }
  }

  // ── Stabiler Visitor-Hash (kein Cookie/localStorage) ─────────────────────
  function getVisitorId() {
    var parts = [
      canvasFingerprint(),
      screen.width + 'x' + screen.height,
      navigator.language || '',
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      navigator.hardwareConcurrency || '',
    ].join('|');
    var h = 2166136261;
    for (var i = 0; i < parts.length; i++) {
      h ^= parts.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  // ── Session-ID (pro Browser-Tab) ─────────────────────────────────────────
  function getSessionId() {
    var key = '_as';
    var sid = sessionStorage.getItem(key);
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(key, sid);
    }
    return sid;
  }

  // ── Seitenanzahl dieser Session (für Session-Flow) ────────────────────────
  function getSessionPageIndex() {
    var key = '_api';
    var n = parseInt(sessionStorage.getItem(key) || '0', 10) + 1;
    sessionStorage.setItem(key, String(n));
    return n;
  }

  // ── Vorherige Seite in dieser Session ─────────────────────────────────────
  function getPreviousPage() {
    return sessionStorage.getItem('_pp') || '';
  }
  function setCurrentPage(page) {
    sessionStorage.setItem('_pp', page);
  }

  // ── Event senden ──────────────────────────────────────────────────────────
  function send() {
    try {
      var visitorId    = getVisitorId();
      var sessionId    = getSessionId();
      var pageIndex    = getSessionPageIndex();
      var previousPage = getPreviousPage();
      var currentPage  = location.pathname + location.search;

      var payload = {
        page:         currentPage,
        previousPage: previousPage,       // woher innerhalb der Site
        pageIndex:    pageIndex,          // wie viele Seiten diese Session
        referrer:     document.referrer || '',
        userAgent:    navigator.userAgent,
        screenWidth:  screen.width,
        language:     navigator.language || '',
        timestamp:    Date.now(),
        sessionId:    sessionId,
        visitorId:    visitorId,
      };

      setCurrentPage(currentPage);

      fetch(WORKER_URL + '/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(function () {});
    } catch (e) { /* leises Scheitern */ }
  }

  // SPA-Support
  function patchHistory(method) {
    var orig = history[method];
    history[method] = function () {
      orig.apply(this, arguments);
      send();
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', send);
  } else {
    send();
  }

  window.addEventListener('popstate', send);
  patchHistory('pushState');
  patchHistory('replaceState');
})();
