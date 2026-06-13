/**
 * Portfolio Analytics Tracker
 * Leichtgewichtiges Tracking-Script – kein Cookie, kein localStorage.
 * Einbinden: <script src="/analytics/tracker.js" defer></script>
 */

(function () {
  // TODO: Deine Worker-URL eintragen (nach `wrangler deploy`)
  var WORKER_URL = 'https://portfolio-analytics.seyle450.workers.dev';

  // ── Canvas-Fingerprint (DSGVO-freundlich: kein Speichern, nur Zählen) ──────
  function canvasFingerprint() {
    try {
      var c = document.createElement('canvas');
      var ctx = c.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Analytics\u{1F4CA}', 2, 2);
      return c.toDataURL().slice(-20);
    } catch (e) {
      return 'no-canvas';
    }
  }

  // ── Stabiler Visitor-Hash ohne Cookie / localStorage ─────────────────────
  function getVisitorId() {
    var parts = [
      canvasFingerprint(),
      screen.width + 'x' + screen.height,
      navigator.language || '',
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      navigator.hardwareConcurrency || '',
      navigator.deviceMemory || '',
    ].join('|');
    // FNV-1a Hash
    var h = 2166136261;
    for (var i = 0; i < parts.length; i++) {
      h ^= parts.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  // ── Session-ID (pro Browser-Tab, flüchtig) ───────────────────────────────
  function getSessionId() {
    var key = '_as';
    var sid = sessionStorage.getItem(key);
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(key, sid);
    }
    return sid;
  }

  // ── Event senden (fire-and-forget) ──────────────────────────────────────
  function send() {
    try {
      var payload = {
        page: location.pathname + location.search,
        referrer: document.referrer || '',
        userAgent: navigator.userAgent,
        screenWidth: screen.width,
        language: navigator.language || '',
        timestamp: Date.now(),
        sessionId: getSessionId(),
        visitorId: getVisitorId(),
      };

      // Bevorzuge navigator.sendBeacon für Unload-Sicherheit
      if (navigator.sendBeacon) {
        var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(WORKER_URL + '/track', blob);
      } else {
        fetch(WORKER_URL + '/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(function () {});
      }
    } catch (e) {
      // Leises Scheitern – Seite darf nie brechen
    }
  }

  // ── SPA-Support: History-Navigation tracken ───────────────────────────────
  function patchHistory(method) {
    var orig = history[method];
    history[method] = function () {
      orig.apply(this, arguments);
      send();
    };
  }

  // Initialer Seitenaufruf
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', send);
  } else {
    send();
  }

  // SPA-Navigation
  window.addEventListener('popstate', send);
  patchHistory('pushState');
  patchHistory('replaceState');
})();
