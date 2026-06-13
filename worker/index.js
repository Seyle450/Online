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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, OPTIONS',
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

// ── Besucher-Profil aktualisieren ─────────────────────────────────────────────
async function updateVisitorProfile(env, visitorId, { page, sessionId, timestamp, referrer, device, screenWidth, language, country }) {
  const profileKey = `profile:${visitorId}`;
  let profile = {
    visitorId,
    alias: '',
    note: '',
    firstSeen: timestamp,
    lastSeen: timestamp,
    totalPageviews: 0,
    totalSessions: 0,
    totalDurationMs: 0,
    returning: false,
    country: country || '',
    sessions: {},   // sessionId → { start, pages: [{page, ts, durationMs}], referrer, device }
    topPages: {},
  };

  const existing = await env.ANALYTICS.get(profileKey);
  if (existing) {
    try { profile = { ...profile, ...JSON.parse(existing) }; profile.returning = true; } catch { /* */ }
  }

  profile.lastSeen = timestamp;
  if (country) profile.country = country;
  profile.totalPageviews += 1;

  if (!profile.sessions[sessionId]) {
    profile.sessions[sessionId] = { start: timestamp, referrer, device, pages: [] };
    profile.totalSessions += 1;
  }
  profile.sessions[sessionId].pages.push({ page, ts: timestamp, durationMs: 0 });
  profile.topPages[page] = (profile.topPages[page] || 0) + 1;

  // Sessions auf die letzten 50 begrenzen
  const sessionKeys = Object.keys(profile.sessions).sort((a, b) => profile.sessions[b].start - profile.sessions[a].start);
  if (sessionKeys.length > 50) {
    sessionKeys.slice(50).forEach(k => delete profile.sessions[k]);
  }

  await env.ANALYTICS.put(profileKey, JSON.stringify(profile), { expirationTtl: 60 * 60 * 24 * 365 });
  return profile;
}

// ─── POST /track ─────────────────────────────────────────────────────────────

async function handleTrack(request, env) {
  const origin = request.headers.get('Origin') || '';
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400, origin); }

  const {
    page = '/', previousPage = '', pageIndex = 1,
    referrer = '', userAgent = request.headers.get('User-Agent') || '',
    screenWidth = 0, language = '', timestamp = Date.now(), sessionId = '',
  } = body;

  const visitorId = body.visitorId || deriveVisitorId(request);
  const dev = deviceType(screenWidth);
  const country = request.headers.get('CF-IPCountry') || '';
  const utm = (body.utm && typeof body.utm === 'object') ? {
    source:   String(body.utm.source   || '').slice(0, 100),
    medium:   String(body.utm.medium   || '').slice(0, 100),
    campaign: String(body.utm.campaign || '').slice(0, 100),
    content:  String(body.utm.content  || '').slice(0, 100),
    term:     String(body.utm.term     || '').slice(0, 100),
  } : null;

  // ── Besucher-Profil ───────────────────────────────────────────────────────
  const profile = await updateVisitorProfile(env, visitorId, { page, sessionId, timestamp, referrer, device: dev, screenWidth, language, country });

  // ── Event speichern ───────────────────────────────────────────────────────
  const randId = Math.random().toString(36).slice(2, 8);
  await env.ANALYTICS.put(`event:${timestamp}:${randId}`, JSON.stringify({
    page, previousPage, pageIndex, referrer, userAgent, screenWidth, language,
    timestamp, sessionId, visitorId, device: dev, country, utm,
    returning: profile.returning, totalVisits: profile.totalPageviews,
  }), { expirationTtl: 60 * 60 * 24 * 90 });

  // ── Tages-Aggregat ────────────────────────────────────────────────────────
  const dateStr = toDateString(timestamp);
  const dailyKey = `daily:${dateStr}:${page}`;
  let daily = { pageviews: 0, visitors: [] };
  const ex = await env.ANALYTICS.get(dailyKey);
  if (ex) { try { daily = JSON.parse(ex); } catch { /* */ } }
  daily.pageviews += 1;
  if (!daily.visitors.includes(visitorId)) daily.visitors.push(visitorId);
  await env.ANALYTICS.put(dailyKey, JSON.stringify(daily), { expirationTtl: 60 * 60 * 24 * 92 });

  return json({ ok: true }, 200, origin);
}

// ─── POST /duration ───────────────────────────────────────────────────────────

async function handleDuration(request, env) {
  const origin = request.headers.get('Origin') || '';
  let body;
  try { body = await request.json(); } catch { return json({ ok: true }, 200, origin); }

  const { page, durationMs = 0, sessionId = '', visitorId = '', timestamp = Date.now() } = body;
  if (!page || durationMs < 500 || durationMs > 3600000) return json({ ok: true }, 200, origin);

  // Verweildauer im Profil nachführen
  const profileKey = `profile:${visitorId}`;
  const raw = await env.ANALYTICS.get(profileKey);
  if (raw) {
    try {
      const profile = JSON.parse(raw);
      profile.totalDurationMs = (profile.totalDurationMs || 0) + durationMs;
      // letzte Seite im Session-Eintrag aktualisieren
      if (profile.sessions && profile.sessions[sessionId]) {
        const pages = profile.sessions[sessionId].pages;
        // finde die passende Seite (letzter Eintrag mit diesem page-Namen)
        for (let i = pages.length - 1; i >= 0; i--) {
          if (pages[i].page === page && pages[i].durationMs === 0) {
            pages[i].durationMs = durationMs;
            break;
          }
        }
      }
      await env.ANALYTICS.put(profileKey, JSON.stringify(profile), { expirationTtl: 60 * 60 * 24 * 365 });
    } catch { /* */ }
  }

  return json({ ok: true }, 200, origin);
}

// ─── GET /profiles ────────────────────────────────────────────────────────────

async function handleProfiles(request, env) {
  const origin = request.headers.get('Origin') || '';
  if (!isAuthorized(request, env)) return unauthorized(origin);

  const profiles = [];
  let cursor;
  do {
    const opts = { prefix: 'profile:', limit: 100 };
    if (cursor) opts.cursor = cursor;
    const listed = await env.ANALYTICS.list(opts);
    cursor = listed.list_complete ? null : listed.cursor;
    for (const key of listed.keys) {
      const raw = await env.ANALYTICS.get(key.name);
      if (raw) { try { profiles.push(JSON.parse(raw)); } catch { /* */ } }
    }
  } while (cursor);

  profiles.sort((a, b) => b.lastSeen - a.lastSeen);
  return json({ profiles, count: profiles.length }, 200, origin);
}

// ─── PUT /visitor/:id ─────────────────────────────────────────────────────────
// Besucher umbenennen (alias setzen)

async function handleVisitorUpdate(request, env, visitorId) {
  const origin = request.headers.get('Origin') || '';
  if (!isAuthorized(request, env)) return unauthorized(origin);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400, origin); }

  const profileKey = `profile:${visitorId}`;
  const raw = await env.ANALYTICS.get(profileKey);
  if (!raw) return json({ error: 'Visitor not found' }, 404, origin);

  try {
    const profile = JSON.parse(raw);
    if (typeof body.alias === 'string') profile.alias = body.alias.slice(0, 80);
    if (typeof body.note  === 'string') profile.note  = body.note.slice(0, 500);
    await env.ANALYTICS.put(profileKey, JSON.stringify(profile), { expirationTtl: 60 * 60 * 24 * 365 });
    return json({ ok: true, profile }, 200, origin);
  } catch { return json({ error: 'Failed' }, 500, origin); }
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
  const dailyMap = {};
  const recentEvents = [];
  let returningVisitors = 0;
  let newVisitors = 0;
  const sessionFlows = {}; // sessionId → [pages in order]
  const allSessionIds = new Set(); // all unique session IDs
  const landingPages = {}; // page → count as landing page
  const countryCounts = {}; // country code → count
  const utmSourceCount = {}; // utm_source → count
  const utmCampaignCount = {}; // utm_campaign → count
  const utmMediumCount = {}; // utm_medium → count
  let totalDurationMs = 0; // sum of all event-level durations (via /duration events)

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

      // Wiederkehrende Besucher
      if (ev.returning) returningVisitors++;
      else newVisitors++;

      // Session-Flow aufbauen
      if (ev.sessionId) {
        allSessionIds.add(ev.sessionId);
        if (!sessionFlows[ev.sessionId]) sessionFlows[ev.sessionId] = [];
        sessionFlows[ev.sessionId].push({ page: ev.page, ts: ev.timestamp, idx: ev.pageIndex || 1 });
      }

      // Landing Pages
      if (!ev.previousPage || ev.pageIndex === 1) {
        landingPages[ev.page] = (landingPages[ev.page] || 0) + 1;
      }

      // Länder
      if (ev.country) countryCounts[ev.country] = (countryCounts[ev.country] || 0) + 1;

      // UTM
      if (ev.utm) {
        if (ev.utm.source)   utmSourceCount[ev.utm.source]     = (utmSourceCount[ev.utm.source]     || 0) + 1;
        if (ev.utm.campaign) utmCampaignCount[ev.utm.campaign] = (utmCampaignCount[ev.utm.campaign] || 0) + 1;
        if (ev.utm.medium)   utmMediumCount[ev.utm.medium]     = (utmMediumCount[ev.utm.medium]     || 0) + 1;
      }

      if (recentEvents.length < 50) recentEvents.push(ev);
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

  // Session-Flows sortieren und Top-Pfade extrahieren
  const topFlows = Object.values(sessionFlows)
    .filter(flow => flow.length > 1)
    .map(flow => flow.sort((a, b) => a.ts - b.ts).map(f => f.page))
    .reduce((acc, path) => {
      const key = path.join(' → ');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  const topSessionPaths = Object.entries(topFlows)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }));

  const topLandingPages = Object.entries(landingPages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([page, count]) => ({ page, count }));

  const topCountries = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([country, count]) => ({ country, count }));

  const totalSessions = allSessionIds.size;
  const bounceSessions = Object.values(sessionFlows).filter(f => f.length === 1).length;
  const bounceRate = totalSessions > 0 ? Math.round(bounceSessions / totalSessions * 100) : 0;

  const topUtmSources = Object.entries(utmSourceCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([source, count]) => ({ source, count }));
  const topUtmCampaigns = Object.entries(utmCampaignCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([campaign, count]) => ({ campaign, count }));
  const topUtmMediums = Object.entries(utmMediumCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([medium, count]) => ({ medium, count }));

  const summary = {
    totalPageviews,
    uniqueVisitors: uniqueVisitors.size,
    totalSessions,
    bounceRate,
    avgPerDay: days > 0 ? Math.round(totalPageviews / days) : 0,
    topPages,
    deviceTypes: deviceCount,
    topReferrers,
    dailyStats,
    returningVisitors,
    newVisitors,
    topSessionPaths,
    topLandingPages,
    topCountries,
    topUtmSources,
    topUtmCampaigns,
    topUtmMediums,
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
    if (url.pathname === '/duration' && request.method === 'POST') {
      return handleDuration(request, env);
    }
    if (url.pathname === '/data' && request.method === 'GET') {
      return handleData(request, env);
    }
    if (url.pathname === '/summary' && request.method === 'GET') {
      return handleSummary(request, env);
    }
    if (url.pathname === '/profiles' && request.method === 'GET') {
      return handleProfiles(request, env);
    }
    // PUT /visitor/<visitorId>  – Alias / Notiz setzen
    if (url.pathname.startsWith('/visitor/') && (request.method === 'PUT' || request.method === 'PATCH')) {
      const vid = url.pathname.replace('/visitor/', '').trim();
      if (!vid) return json({ error: 'Missing visitorId' }, 400, origin);
      return handleVisitorUpdate(request, env, vid);
    }
    if (url.pathname === '/debug-kv' && request.method === 'GET') {
      if (!isAuthorized(request, env)) return unauthorized(origin);
      try {
        await env.ANALYTICS.put('debug:test', 'hello');
        const val = await env.ANALYTICS.get('debug:test');
        const list = await env.ANALYTICS.list({ limit: 10 });
        return json({ kvWrite: val, keys: list.keys.map(k => k.name) }, 200, origin);
      } catch (e) {
        return json({ error: e.message }, 500, origin);
      }
    }

    return json({ error: 'Not found' }, 404, origin);
  },
};
