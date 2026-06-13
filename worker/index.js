/**
 * Cloudflare Worker – Analytics Backend
 * Empfängt Tracking-Events, speichert sie in KV, liefert Dashboarddaten.
 *
 * Umgebungsvariablen (wrangler secret put):
 *   AUTH_TOKEN  – Bearer-Token für /data und /summary
 *
 * KV-Namespace:
 *   ANALYTICS   – gebunden in wrangler.toml
 */

const CORS_ORIGIN = 'https://seyle450.github.io';

// ─── Hilfsfunktionen ────────────────────────────────────────────────────────

function corsHeaders(origin) {
  const allowed = [CORS_ORIGIN, 'https://seyle450.github.io', 'http://localhost', 'http://127.0.0.1'];
  const use = allowed.some(o => origin && origin.startsWith(o)) ? origin : CORS_ORIGIN;
  return {
    'Access-Control-Allow-Origin': use,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status = 200, origin = '') {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

function unauthorized(origin) {
  return json({ error: 'Unauthorized' }, 401, origin);
}

function isAuthorized(request, env) {
  const auth = request.headers.get('Authorization') || '';
  return auth === `Bearer ${(env.AUTH_TOKEN || '').trim()}`;
}

/** Einfacher FNV-1a Hash → kurzer Hex-String (für visitorId aus IP+UA) */
function fnv1a(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Leitet einen anonymen Besucher-Hash aus IP + User-Agent ab */
function deriveVisitorId(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ua = request.headers.get('User-Agent') || 'unknown';
  return fnv1a(ip + ua);
}

/** Bestimmt den Gerätetyp anhand der screenWidth */
function deviceType(screenWidth) {
  if (!screenWidth) return 'unknown';
  if (screenWidth < 768) return 'mobile';
  if (screenWidth <= 1024) return 'tablet';
  return 'desktop';
}

/** Gibt YYYY-MM-DD für einen Unix-Timestamp (ms) zurück */
function toDateString(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}

/** Gibt die letzten N Tage als YYYY-MM-DD Array zurück */
function lastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

// ─── POST /track ─────────────────────────────────────────────────────────────

async function handleTrack(request, env) {
  const origin = request.headers.get('Origin') || '';

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400, origin);
  }

  const {
    page = '/',
    referrer = '',
    userAgent = request.headers.get('User-Agent') || '',
    screenWidth = 0,
    language = '',
    timestamp = Date.now(),
    sessionId = '',
  } = body;

  // visitorId: bevorzuge clientseitigen Hash, fallback auf Server-Hash
  const visitorId = body.visitorId || deriveVisitorId(request);

  // ── Einzelnes Event speichern ──────────────────────────────────────────────
  const randId = Math.random().toString(36).slice(2, 8);
  const eventKey = `event:${timestamp}:${randId}`;
  const event = {
    page,
    referrer,
    userAgent,
    screenWidth,
    language,
    timestamp,
    sessionId,
    visitorId,
    device: deviceType(screenWidth),
  };
  await env.ANALYTICS.put(eventKey, JSON.stringify(event), {
    // Events nach 90 Tagen automatisch löschen
    expirationTtl: 60 * 60 * 24 * 90,
  });

  // ── Tägliche Aggregation aktualisieren ────────────────────────────────────
  const dateStr = toDateString(timestamp);
  const dailyKey = `daily:${dateStr}:${page}`;
  let daily = { pageviews: 0, visitors: [] };
  const existing = await env.ANALYTICS.get(dailyKey);
  if (existing) {
    try { daily = JSON.parse(existing); } catch { /* ignore */ }
  }
  daily.pageviews += 1;
  if (!daily.visitors.includes(visitorId)) {
    daily.visitors.push(visitorId);
  }
  await env.ANALYTICS.put(dailyKey, JSON.stringify(daily), {
    expirationTtl: 60 * 60 * 24 * 92,
  });

  return json({ ok: true }, 200, origin);
}

// ─── GET /data ────────────────────────────────────────────────────────────────

async function handleData(request, env) {
  const origin = request.headers.get('Origin') || '';
  if (!isAuthorized(request, env)) return unauthorized(origin);

  const url = new URL(request.url);
  const days = Math.min(parseInt(url.searchParams.get('days') || '30', 10), 90);
  const since = Date.now() - days * 24 * 60 * 60 * 1000;

  // KV-Liste aller event: Keys (max 1000 pro list-Aufruf, Paginierung)
  const events = [];
  let cursor;
  do {
    const opts = { prefix: 'event:', limit: 1000 };
    if (cursor) opts.cursor = cursor;
    const listed = await env.ANALYTICS.list(opts);
    cursor = listed.list_complete ? null : listed.cursor;

    for (const key of listed.keys) {
      // Timestamp steht im Key: event:<ts>:<rand>
      const parts = key.name.split(':');
      const ts = parseInt(parts[1], 10);
      if (ts >= since) {
        const raw = await env.ANALYTICS.get(key.name);
        if (raw) {
          try { events.push(JSON.parse(raw)); } catch { /* skip */ }
        }
      }
    }
  } while (cursor);

  events.sort((a, b) => b.timestamp - a.timestamp);
  return json({ events, count: events.length }, 200, origin);
}

// ─── GET /summary ─────────────────────────────────────────────────────────────

async function handleSummary(request, env) {
  const origin = request.headers.get('Origin') || '';
  if (!isAuthorized(request, env)) return unauthorized(origin);

  const url = new URL(request.url);
  const days = Math.min(parseInt(url.searchParams.get('days') || '30', 10), 90);

  const dateRange = lastNDays(days);
  const since = Date.now() - days * 24 * 60 * 60 * 1000;

  let totalPageviews = 0;
  const uniqueVisitors = new Set();
  const pageCount = {};
  const referrerCount = {};
  const deviceCount = { desktop: 0, mobile: 0, tablet: 0, unknown: 0 };
  const dailyMap = {}; // date → { pageviews, visitors: Set }
  const recentEvents = [];

  // Tages-Aggregate aus KV lesen (effizient, kein Event-Scan nötig für Summen)
  for (const date of dateRange) {
    dailyMap[date] = { pageviews: 0, visitors: new Set() };
    let dayCursor;
    do {
      const opts = { prefix: `daily:${date}:`, limit: 1000 };
      if (dayCursor) opts.cursor = dayCursor;
      const listed = await env.ANALYTICS.list(opts);
      dayCursor = listed.list_complete ? null : listed.cursor;

      for (const key of listed.keys) {
        const raw = await env.ANALYTICS.get(key.name);
        if (!raw) continue;
        let d;
        try { d = JSON.parse(raw); } catch { continue; }
        const page = key.name.split(':').slice(2).join(':');
        totalPageviews += d.pageviews || 0;
        dailyMap[date].pageviews += d.pageviews || 0;
        (d.visitors || []).forEach(v => {
          uniqueVisitors.add(v);
          dailyMap[date].visitors.add(v);
        });
        pageCount[page] = (pageCount[page] || 0) + (d.pageviews || 0);
      }
    } while (dayCursor);
  }

  // Events für Gerätetypen + Referrer + recentEvents lesen
  let evCursor;
  do {
    const opts = { prefix: 'event:', limit: 1000 };
    if (evCursor) opts.cursor = evCursor;
    const listed = await env.ANALYTICS.list(opts);
    evCursor = listed.list_complete ? null : listed.cursor;

    for (const key of listed.keys) {
      const parts = key.name.split(':');
      const ts = parseInt(parts[1], 10);
      if (ts < since) continue;
      const raw = await env.ANALYTICS.get(key.name);
      if (!raw) continue;
      let ev;
      try { ev = JSON.parse(raw); } catch { continue; }

      const dev = ev.device || deviceType(ev.screenWidth);
      if (dev in deviceCount) deviceCount[dev]++;
      else deviceCount.unknown++;

      if (ev.referrer) {
        try {
          const ref = new URL(ev.referrer).hostname;
          if (ref) referrerCount[ref] = (referrerCount[ref] || 0) + 1;
        } catch { /* ignore */ }
      }

      if (recentEvents.length < 20) recentEvents.push(ev);
    }
  } while (evCursor);

  const topPages = Object.entries(pageCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([page, views]) => ({ page, views }));

  const topReferrers = Object.entries(referrerCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([referrer, count]) => ({ referrer, count }));

  const dailyStats = dateRange.map(date => ({
    date,
    pageviews: dailyMap[date]?.pageviews || 0,
    uniqueVisitors: dailyMap[date]?.visitors?.size || 0,
  }));

  const summary = {
    totalPageviews,
    uniqueVisitors: uniqueVisitors.size,
    avgPerDay: days > 0 ? Math.round(totalPageviews / days) : 0,
    topPages,
    deviceTypes: deviceCount,
    topReferrers,
    dailyStats,
    recentEvents: recentEvents.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20),
  };

  return json(summary, 200, origin);
}

// ─── Router ───────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);

    if (url.pathname === '/track' && request.method === 'POST') {
      return handleTrack(request, env);
    }
    if (url.pathname === '/data' && request.method === 'GET') {
      return handleData(request, env);
    }
    if (url.pathname === '/summary' && request.method === 'GET') {
      return handleSummary(request, env);
    }

    return json({ error: 'Not found' }, 404, origin);
  },
};
