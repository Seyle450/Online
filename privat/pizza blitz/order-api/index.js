/**
 * Pizza Blitz — Bestell-Backend (Cloudflare Worker)
 * ─────────────────────────────────────────────────
 * Flow:  Website-Warenkorb → POST /checkout → Stripe Checkout (gehostet)
 *        → Kunde zahlt → Stripe POST /webhook → Bestellung als bezahlt markiert
 *        → WinOrder-Bestellung erzeugt + Benachrichtigung.
 *
 * Sicherheit: Preise werden IMMER serverseitig aus menu.js berechnet — die vom
 * Browser gesendeten Beträge werden ignoriert (Manipulationsschutz). Der
 * Webhook prüft die Stripe-Signatur (HMAC), sonst wird er abgelehnt.
 *
 * Secrets (wrangler secret put …):
 *   STRIPE_SECRET_KEY      – sk_test_… (Test) bzw. sk_live_… (Live)
 *   STRIPE_WEBHOOK_SECRET  – whsec_… (aus dem Stripe-Webhook-Endpunkt)
 *   TELEGRAM_BOT_TOKEN     – optional: Benachrichtigung an dich bei neuer Bestellung
 *   TELEGRAM_CHAT_ID       – optional
 * Vars (wrangler.toml):
 *   SITE_URL               – Basis-URL der Pizza-Seite (für success/cancel)
 *   WINORDER_EMAIL         – später: Postfach, das WinOrder prüft (Phase 3)
 */
import { CONFIG, priceKey, isOpenNow } from './menu.js';

const ALLOWED_ORIGINS = [
  /^https:\/\/elyesferchichi\.com$/,
  /^https:\/\/[a-z0-9-]+\.elyesferchichi\.com$/,
  /^https:\/\/(www\.)?pizzablitz-bremen\.de$/,
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

// ── Bestellung serverseitig aus dem Warenkorb bauen (Preise NUR von hier) ─────
export function buildOrder(body) {
  // Bestellungen nur während der Öffnungszeiten (Bremer Zeit). Sicherheitsnetz —
  // das Frontend sperrt den Button schon, hier wird es serverseitig erzwungen.
  if (!isOpenNow()) {
    return { error: 'Wir haben gerade geschlossen. Bitte innerhalb der Öffnungszeiten bestellen.' };
  }
  const items = body && body.items;
  if (!items || typeof items !== 'object' || !Object.keys(items).length) {
    return { error: 'Warenkorb ist leer.' };
  }
  const mode = body.mode === 'abholung' ? 'abholung' : 'lieferung';
  const lines = [];
  let subtotalCents = 0;
  for (const key of Object.keys(items)) {
    const qty = parseInt(items[key], 10);
    if (!qty || qty < 1 || qty > 50) return { error: 'Ungültige Menge.' };
    const info = priceKey(key);
    if (!info) return { error: 'Unbekannter Artikel: ' + key };
    const lineCents = euroToCents(info.unitPrice) * qty;
    subtotalCents += lineCents;
    lines.push({
      key, art: info.art, name: info.name, sizeLabel: info.sizeLabel,
      qty, unitPrice: info.unitPrice, lineTotal: centsToEuro(lineCents),
    });
  }
  const subtotal = centsToEuro(subtotalCents);

  // Kundendaten
  const c = body.customer || {};
  const name = String(c.name || '').trim().slice(0, 80);
  const phone = String(c.phone || '').trim().slice(0, 40);
  const email = String(c.email || '').trim().slice(0, 120);
  if (!name || !phone) return { error: 'Name und Telefon sind Pflicht.' };

  let address = null, deliveryCents = 0;
  if (mode === 'lieferung') {
    const a = body.address || {};
    address = {
      street: String(a.street || '').trim().slice(0, 120),
      zip: String(a.zip || '').trim().slice(0, 12),
      city: String(a.city || '').trim().slice(0, 60),
    };
    if (!address.street || !address.zip) return { error: 'Lieferadresse ist unvollständig.' };
    if (subtotal < CONFIG.minOrder) {
      return { error: 'Mindestbestellwert für Lieferung: ' + CONFIG.minOrder.toFixed(2) + ' €' };
    }
    deliveryCents = subtotalCents >= euroToCents(CONFIG.freeFrom) ? 0 : euroToCents(CONFIG.deliveryFee);
  }
  const totalCents = subtotalCents + deliveryCents;

  return {
    order: {
      id: 'PB-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
      createdAt: Date.now(),
      status: 'pending',
      mode, lines,
      subtotal, delivery: centsToEuro(deliveryCents), total: centsToEuro(totalCents),
      customer: { name, phone, email },
      address,
      time: String(body.time || 'asap').slice(0, 20),
      note: String(body.note || '').trim().slice(0, 300),
    },
  };
}

// ── WinOrder-Bestellung erzeugen ──────────────────────────────────────────────
// ENTWURF nach der WinOrder-Shop-Schnittstelle. Feldnamen/Struktur vor Live-Betrieb
// gegen die offizielle Spezifikation (WinOrder-EShop-Spezifikation.pdf) bzw. das
// WinOrder des Kunden abgleichen. Für Phase 1 dient das zum Prüfen des Formats.
function buildWinOrder(o) {
  return {
    orderId: o.id,
    orderDate: new Date(o.createdAt).toISOString(),
    orderType: o.mode === 'lieferung' ? 'delivery' : 'pickup',
    requestedTime: o.time,
    paymentMethod: 'PayPal/Online',
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
      articleNumber: l.art,
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

// ── POST /checkout ────────────────────────────────────────────────────────────
async function handleCheckout(request, env, origin) {
  // Nur von erlaubten Seiten (härtet gegen Skript-Aufrufe von fremden Origins).
  if (!originAllowed(origin)) return json({ error: 'Zugriff nicht erlaubt.' }, 403, origin);
  if (!env.STRIPE_SECRET_KEY) return json({ error: 'Zahlung nicht konfiguriert.' }, 500, origin);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Ungültige Anfrage.' }, 400, origin); }

  const built = buildOrder(body);
  if (built.error) return json({ error: built.error }, 400, origin);
  const order = built.order;

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

  const site = (env.SITE_URL || origin || 'https://elyesferchichi.com').replace(/\/$/, '');
  const params = {
    mode: 'payment',
    success_url: site + '/?bestellung=ok&oid=' + order.id,
    cancel_url: site + '/?bestellung=abbruch',
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
  await env.ORDERS.put('order:' + order.id, JSON.stringify(order), { expirationTtl: 60 * 60 * 24 * 14 });

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
          order.stripePaymentIntent = event.data.object.payment_intent || '';
          await env.ORDERS.put('order:' + orderId, JSON.stringify(order), { expirationTtl: 60 * 60 * 24 * 14 });

          const wo = buildWinOrder(order);
          await env.ORDERS.put('winorder:' + orderId, JSON.stringify(wo), { expirationTtl: 60 * 60 * 24 * 14 });

          const items = order.lines.map((l) => `${l.qty}× ${l.name}${l.sizeLabel ? ' (' + l.sizeLabel + ')' : ''}`).join('\n');
          await telegram(env,
            `🍕 <b>Neue Pizza-Bestellung</b> ${order.id}\n` +
            `${order.mode === 'lieferung' ? '🚗 Lieferung' : '🥡 Abholung'} · <b>${order.total.toFixed(2)} €</b> (bezahlt)\n\n` +
            `${items}\n\n` +
            `<b>${order.customer.name}</b> · ${order.customer.phone}\n` +
            (order.address ? `${order.address.street}, ${order.address.zip} ${order.address.city}\n` : '') +
            (order.note ? `📝 ${order.note}` : ''));
          // WinOrder-Zustellung (Phase 3): hier die Bestellung an WINORDER_EMAIL /
          // die WinOrder-REST-API übergeben, sobald der Kunde das Postfach nennt.
        }
      }
    }
  }
  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

// ── GET /order/:id  (Status + Positionen für Bezahlt-Screen & Live-Tracker) ────
// Bewusst OHNE Kundendaten (Name/Adresse/Telefon) — nur nicht-personenbezogene Infos.
async function handleOrderStatus(id, env, origin) {
  const raw = await env.ORDERS.get('order:' + String(id).slice(0, 40));
  if (!raw) return json({ error: 'Bestellung nicht gefunden.' }, 404, origin);
  const o = JSON.parse(raw);
  return json({
    id: o.id, status: o.status, mode: o.mode,
    subtotal: o.subtotal, delivery: o.delivery, total: o.total,
    createdAt: o.createdAt, paidAt: o.paidAt || null,
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
    if (url.pathname === '/health') return json({ ok: true, stripe: !!env.STRIPE_SECRET_KEY }, 200, origin);
    return json({ error: 'Not found' }, 404, origin);
  },
};
