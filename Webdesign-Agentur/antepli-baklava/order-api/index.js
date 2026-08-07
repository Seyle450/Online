/**
 * ANTEPLI — Bestell-Backend (Cloudflare Worker)
 * ─────────────────────────────────────────────
 * Flow:  Warenkorb (Landing-Page-Section oder /bestellen.html)
 *        → POST /checkout → Stripe Checkout (gehostet)
 *        → Kunde zahlt → Stripe POST /webhook → Bestellung als bezahlt markiert
 *        → Küchen-Ticket in KV + Telegram-Benachrichtigung.
 *
 * Sicherheit: Preise werden IMMER serverseitig aus menu.js berechnet — die vom
 * Browser gesendeten Beträge werden ignoriert (Manipulationsschutz). Der
 * Webhook prüft die Stripe-Signatur (HMAC), sonst wird er abgelehnt.
 *
 * Secrets (wrangler secret put …):
 *   STRIPE_SECRET_KEY      – sk_test_… (Test) bzw. sk_live_… (Live)
 *   STRIPE_WEBHOOK_SECRET  – whsec_… (aus dem Stripe-Webhook-Endpunkt)
 *   TELEGRAM_BOT_TOKEN     – Benachrichtigung bei neuer Bestellung
 *   TELEGRAM_CHAT_ID       – Ziel-Chat
 * Vars (wrangler.toml):
 *   SITE_URL               – Basis-URL der Antepli-Seite (für success/cancel)
 */
import { CONFIG, priceKey, isOpenNow, localNow, HOURS } from './menu.js';

const ALLOWED_ORIGINS = [
  /^https:\/\/elyesferchichi\.com$/,
  /^https:\/\/[a-z0-9-]+\.elyesferchichi\.com$/,
  /^https:\/\/(www\.)?antepli\.de$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

function originAllowed(origin) {
  return !!origin && ALLOWED_ORIGINS.some((re) => re.test(origin));
}

function corsHeaders(origin) {
  const ok = originAllowed(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : 'https://elyesferchichi.com',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}
function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

// ── Stripe: Form-Encoding für verschachtelte Parameter (a[b][c]=v) ────────────
function encodeForm(obj, prefix, pairs) {
  pairs = pairs || [];
  for (const k in obj) {
    const v = obj[k];
    if (v === null || v === undefined) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object') encodeForm(v, key, pairs);
    else pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(v));
  }
  return pairs;
}
const toForm = (obj) => encodeForm(obj).join('&');

function euroToCents(v) { return Math.round(v * 100); }
function centsToEuro(c) { return Math.round(c) / 100; }

// Heutiges Datum in Bremer Ortszeit als 'YYYY-MM-DD'.
function localDateISO(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: HOURS.tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}
// 'YYYY-MM-DD' + n Tage → 'YYYY-MM-DD' (UTC-Arithmetik, für Datumsvergleiche exakt genug)
function addDaysISO(iso, n) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const isISODate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const isTime = (s) => /^\d{2}:\d{2}$/.test(s);

// ── Bestellung serverseitig aus dem Warenkorb bauen (Preise NUR von hier) ─────
export function buildOrder(body, now = new Date(), ignoreHours = false) {
  // Bestellungen nur während der Öffnungszeiten (Bremer Zeit). Sicherheitsnetz —
  // das Frontend sperrt den Button schon, hier wird es serverseitig erzwungen.
  // IGNORE_HOURS=1 hebelt das zum Testen aus und wird in /health angezeigt,
  // damit es nicht unbemerkt anbleibt.
  if (!ignoreHours && !isOpenNow(now)) {
    return { error: 'Wir haben gerade geschlossen. Bitte innerhalb der Öffnungszeiten bestellen.' };
  }
  const items = body && body.items;
  if (!items || typeof items !== 'object' || Array.isArray(items) || !Object.keys(items).length) {
    return { error: 'Warenkorb ist leer.' };
  }
  if (Object.keys(items).length > 60) return { error: 'Zu viele verschiedene Artikel.' };

  const mode = body.mode === 'abholung' ? 'abholung' : 'lieferung';
  const lines = [];
  let subtotalCents = 0;
  let hasBlech = false;

  for (const key of Object.keys(items)) {
    const qty = parseInt(items[key], 10);
    if (!qty || qty < 1 || qty > 30) return { error: 'Ungültige Menge.' };
    const info = priceKey(key);
    if (!info) return { error: 'Unbekannter Artikel: ' + key };
    if (info.cat === 'blech') hasBlech = true;
    const lineCents = euroToCents(info.unitPrice) * qty;
    subtotalCents += lineCents;
    lines.push({
      key, name: info.name, cat: info.cat, sizeLabel: info.sizeLabel,
      qty, unitPrice: info.unitPrice, lineTotal: centsToEuro(lineCents),
    });
  }
  const subtotal = centsToEuro(subtotalCents);

  // ── Kundendaten ────────────────────────────────────────────────────────────
  const c = body.customer || {};
  const name = String(c.name || '').trim().slice(0, 80);
  const phone = String(c.phone || '').trim().slice(0, 40);
  const email = String(c.email || '').trim().slice(0, 120);
  if (!name || !phone) return { error: 'Name und Telefon sind Pflicht.' };

  // ── Liefer- vs. Abholmodus ─────────────────────────────────────────────────
  let address = null, deliveryCents = 0;
  if (mode === 'lieferung') {
    const a = body.address || {};
    address = {
      street: String(a.street || '').trim().slice(0, 120),
      zip: String(a.zip || '').trim().slice(0, 12),
      city: String(a.city || '').trim().slice(0, 60) || 'Bremen',
    };
    if (!address.street || !address.zip) return { error: 'Lieferadresse ist unvollständig.' };
    if (subtotal < CONFIG.minOrder) {
      return { error: 'Mindestbestellwert für Lieferung: ' + CONFIG.minOrder.toFixed(2).replace('.', ',') + ' €' };
    }
    deliveryCents = subtotalCents >= euroToCents(CONFIG.freeFrom) ? 0 : euroToCents(CONFIG.deliveryFee);
  }

  // ── Wunschtermin ───────────────────────────────────────────────────────────
  // Ganze Bleche werden frisch gebacken → mindestens CONFIG.blechLeadDays Vorlauf.
  const p = body.pickup || {};
  const wantDate = String(p.date || '').trim();
  const wantTime = String(p.time || '').trim();
  let pickup = null;

  if (wantDate) {
    if (!isISODate(wantDate)) return { error: 'Ungültiges Wunschdatum.' };
    const today = localDateISO(now);
    if (wantDate < today) return { error: 'Das Wunschdatum liegt in der Vergangenheit.' };
    if (wantDate > addDaysISO(today, 60)) return { error: 'Wunschdatum liegt zu weit in der Zukunft.' };
    if (wantTime && !isTime(wantTime)) return { error: 'Ungültige Wunschuhrzeit.' };
    pickup = { date: wantDate, time: wantTime || null };
  }
  if (hasBlech) {
    const earliest = addDaysISO(localDateISO(now), CONFIG.blechLeadDays);
    if (!pickup) return { error: 'Für ganze Bleche brauchen wir einen Wunschtermin (frühestens ' + earliest + ').' };
    if (pickup.date < earliest) {
      return { error: 'Ganze Bleche backen wir frisch — frühester Termin: ' + earliest + '.' };
    }
  }

  const totalCents = subtotalCents + deliveryCents;

  return {
    order: {
      id: 'AB-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
      createdAt: Date.now(),
      status: 'pending',
      mode, lines, hasBlech,
      subtotal, delivery: centsToEuro(deliveryCents), total: centsToEuro(totalCents),
      customer: { name, phone, email },
      address,
      pickup,
      note: String(body.note || '').trim().slice(0, 300),
    },
  };
}

// ── Küchen-Ticket (das, was in der Backstube gebraucht wird) ──────────────────
function buildTicket(o) {
  return {
    orderId: o.id,
    orderDate: new Date(o.createdAt).toISOString(),
    orderType: o.mode === 'lieferung' ? 'delivery' : 'pickup',
    requestedDate: o.pickup ? o.pickup.date : null,
    requestedTime: o.pickup ? o.pickup.time : null,
    paymentMethod: 'Stripe (online)',
    paid: true,
    currency: 'EUR',
    customer: {
      name: o.customer.name,
      phone: o.customer.phone,
      email: o.customer.email,
      street: o.address ? o.address.street : '',
      zipCode: o.address ? o.address.zip : '',
      city: o.address ? o.address.city : '',
    },
    articles: o.lines.map((l) => ({
      itemId: l.key,
      name: l.name + (l.sizeLabel ? ' · ' + l.sizeLabel : ''),
      quantity: l.qty,
      singlePrice: l.unitPrice,
      totalPrice: l.lineTotal,
    })),
    deliveryCost: o.delivery,
    totalPrice: o.total,
    comment: o.note,
  };
}

async function telegram(env, text) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' }),
    });
  } catch (e) {}
}

// Konzept-Modus: solange kein Stripe-Key gesetzt ist (oder DEMO_MODE=1), wird
// nicht kassiert. Die Bestellung wird trotzdem geprüft, gespeichert und per
// Telegram gemeldet — so sieht man echte Testbestellungen von der Konzeptseite.
function isDemo(env) {
  return env.DEMO_MODE === '1' || !env.STRIPE_SECRET_KEY;
}

// Lesbare Bestellübersicht für Telegram
function orderText(o) {
  const items = o.lines
    .map((l) => `${l.qty}× ${l.name}${l.sizeLabel ? ' (' + l.sizeLabel + ')' : ''} — ${l.lineTotal.toFixed(2)} €`)
    .join('\n');
  const termin = o.pickup
    ? `📅 ${o.pickup.date}${o.pickup.time ? ' um ' + o.pickup.time : ''}\n`
    : '';
  return `${o.mode === 'lieferung' ? '🚗 Lieferung' : '🥡 Abholung'} · <b>${o.total.toFixed(2)} €</b>\n`
    + (o.hasBlech ? '🎂 <b>Enthält ganze Bleche</b>\n' : '')
    + termin + '\n'
    + `${items}\n\n`
    + `<b>${o.customer.name}</b> · ${o.customer.phone}\n`
    + (o.customer.email ? `${o.customer.email}\n` : '')
    + (o.address ? `${o.address.street}, ${o.address.zip} ${o.address.city}\n` : '')
    + (o.note ? `📝 ${o.note}` : '');
}

// ── POST /checkout ────────────────────────────────────────────────────────────
async function handleCheckout(request, env, origin) {
  // Nur von erlaubten Seiten (härtet gegen Skript-Aufrufe von fremden Origins).
  if (!originAllowed(origin)) return json({ error: 'Zugriff nicht erlaubt.' }, 403, origin);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Ungültige Anfrage.' }, 400, origin); }

  const built = buildOrder(body, new Date(), env.IGNORE_HOURS === '1');
  if (built.error) return json({ error: built.error }, 400, origin);
  const order = built.order;

  // ── Konzept-Modus: melden statt kassieren ─────────────────────────────────
  if (isDemo(env)) {
    order.status = 'demo';
    await env.ORDERS.put('order:' + order.id, JSON.stringify(order), { expirationTtl: 60 * 60 * 24 * 30 });
    await telegram(env,
      `🍯 <b>Testbestellung auf der Antepli-Konzeptseite</b>\n` +
      `<i>Konzept-Modus — es wurde nichts bezahlt und nichts ausgeliefert.</i>\n` +
      `Nr. ${order.id}\n\n` + orderText(order));
    return json({ demo: true, orderId: order.id, total: order.total }, 200, origin);
  }

  // Stripe-Positionen (serverseitige Preise)
  const line_items = order.lines.map((l) => ({
    price_data: {
      currency: CONFIG.currency,
      unit_amount: euroToCents(l.unitPrice),
      product_data: { name: l.name + (l.sizeLabel ? ' · ' + l.sizeLabel : '') },
    },
    quantity: l.qty,
  }));
  if (order.delivery > 0) {
    line_items.push({
      price_data: { currency: CONFIG.currency, unit_amount: euroToCents(order.delivery), product_data: { name: 'Lieferung' } },
      quantity: 1,
    });
  }

  const site = (env.SITE_URL || origin || 'https://antepli.elyesferchichi.com').replace(/\/$/, '');
  const params = {
    mode: 'payment',
    success_url: site + '/bestellen.html?bestellung=ok&oid=' + order.id,
    cancel_url: site + '/bestellen.html?bestellung=abbruch',
    client_reference_id: order.id,
    metadata: { orderId: order.id },
    payment_intent_data: { metadata: { orderId: order.id } },
    line_items,
  };
  if (order.customer.email) params.customer_email = order.customer.email;

  const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: toForm(params),
  });
  const session = await resp.json();
  if (!resp.ok) {
    return json({ error: 'Zahlung konnte nicht gestartet werden.', detail: session.error && session.error.message }, 502, origin);
  }

  order.stripeSessionId = session.id;
  await env.ORDERS.put('order:' + order.id, JSON.stringify(order), { expirationTtl: 60 * 60 * 24 * 30 });

  return json({ url: session.url, orderId: order.id }, 200, origin);
}

// ── Stripe-Webhook-Signatur prüfen ────────────────────────────────────────────
function hexEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
async function verifyStripe(payload, sigHeader, secret) {
  if (!sigHeader) return false;
  const parts = {};
  sigHeader.split(',').forEach((p) => {
    const i = p.indexOf('=');
    if (i < 0) return;
    const k = p.slice(0, i), v = p.slice(i + 1);
    (parts[k] = parts[k] || []).push(v);
  });
  const t = parts.t && parts.t[0];
  const v1 = parts.v1 || [];
  if (!t || !v1.length) return false;
  if (Math.abs(Date.now() / 1000 - parseInt(t, 10)) > 300) return false; // 5 Min Toleranz
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(t + '.' + payload));
  const expected = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return v1.some((c) => hexEqual(c, expected));
}

// ── POST /webhook ─────────────────────────────────────────────────────────────
async function handleWebhook(request, env) {
  const payload = await request.text();
  const sig = request.headers.get('Stripe-Signature');
  if (!env.STRIPE_WEBHOOK_SECRET || !(await verifyStripe(payload, sig, env.STRIPE_WEBHOOK_SECRET))) {
    return new Response('Invalid signature', { status: 400 });
  }
  let event;
  try { event = JSON.parse(payload); } catch { return new Response('Bad payload', { status: 400 }); }

  if (event.type === 'checkout.session.completed') {
    const obj = event.data.object || {};
    const orderId = (obj.metadata && obj.metadata.orderId) || obj.client_reference_id || null;
    if (orderId) {
      const raw = await env.ORDERS.get('order:' + orderId);
      if (raw) {
        const order = JSON.parse(raw);
        if (order.status !== 'paid') {
          order.status = 'paid';
          order.paidAt = Date.now();
          order.stripePaymentIntent = obj.payment_intent || '';
          await env.ORDERS.put('order:' + orderId, JSON.stringify(order), { expirationTtl: 60 * 60 * 24 * 30 });

          const ticket = buildTicket(order);
          await env.ORDERS.put('ticket:' + orderId, JSON.stringify(ticket), { expirationTtl: 60 * 60 * 24 * 30 });

          await telegram(env,
            `🍯 <b>Neue Antepli-Bestellung — bezahlt</b>\nNr. ${order.id}\n\n` + orderText(order));
        }
      }
    }
  }
  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

// ── GET /order/:id  (Status + Positionen für den Bezahlt-Screen) ──────────────
// Bewusst OHNE Kundendaten (Name/Adresse/Telefon) — nur nicht-personenbezogene Infos.
async function handleOrderStatus(id, env, origin) {
  const raw = await env.ORDERS.get('order:' + String(id).slice(0, 40));
  if (!raw) return json({ error: 'Bestellung nicht gefunden.' }, 404, origin);
  const o = JSON.parse(raw);
  return json({
    id: o.id, status: o.status, mode: o.mode,
    subtotal: o.subtotal, delivery: o.delivery, total: o.total,
    createdAt: o.createdAt, paidAt: o.paidAt || null,
    pickup: o.pickup || null,
    lines: (o.lines || []).map((l) => ({
      name: l.name, sizeLabel: l.sizeLabel || null, qty: l.qty, unitPrice: l.unitPrice, lineTotal: l.lineTotal,
    })),
  }, 200, origin);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });

    if (url.pathname === '/checkout' && request.method === 'POST') return handleCheckout(request, env, origin);
    if (url.pathname === '/webhook' && request.method === 'POST') return handleWebhook(request, env);
    if (url.pathname.startsWith('/order/') && request.method === 'GET') {
      return handleOrderStatus(url.pathname.slice('/order/'.length), env, origin);
    }
    if (url.pathname === '/health') {
      const n = localNow();
      return json({
        ok: true,
        demo: isDemo(env),
        ignoreHours: env.IGNORE_HOURS === '1',
        stripe: !!env.STRIPE_SECRET_KEY,
        telegram: !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID),
        open: isOpenNow(),
        localTime: String(Math.floor(n.minutes / 60)).padStart(2, '0') + ':' + String(n.minutes % 60).padStart(2, '0'),
      }, 200, origin);
    }
    return json({ error: 'Not found' }, 404, origin);
  },
};
