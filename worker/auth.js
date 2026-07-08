/**
 * Auth-Kern für das Multi-Tenant-Analytics-Login.
 *
 * Reine Logik (kein HTTP) – die dünnen Endpunkt-Handler liegen in index.js.
 *   • Passwort-Prüfung:  PBKDF2-HMAC-SHA256 via WebCrypto (identisch zu hash-password.mjs)
 *   • Sessions:          zufällige, widerrufbare Opaque-Tokens in KV (ANALYTICS)
 *                        Der KV-Schlüssel wird per HMAC(SESSION_SECRET) aus dem Token
 *                        abgeleitet – das rohe Token taucht nie als KV-Key auf.
 *   • Mandanten-Logik:   effectiveSite() erzwingt serverseitig, dass ein Kunde
 *                        ausschließlich seine eigene Site sieht.
 */
import { USERS, SITES } from './auth-config.js';

// ── Byte-Helfer ───────────────────────────────────────────────────────────────
function b64ToBytes(b64) {
  const bin = atob(b64);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}
function bytesToB64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function bytesToHex(bytes) {
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s;
}
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}

// ── Passwort-Prüfung (PBKDF2, Format: pbkdf2$iter$saltB64$hashB64) ─────────────
export async function verifyPassword(password, stored) {
  try {
    const parts = String(stored).split('$');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
    const iterations = parseInt(parts[1], 10);
    if (!Number.isFinite(iterations) || iterations < 1000) return false;
    const salt = b64ToBytes(parts[2]);
    const expected = b64ToBytes(parts[3]);
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, expected.length * 8
    );
    return timingSafeEqual(new Uint8Array(bits), expected);
  } catch (e) {
    return false;
  }
}

// Fester, gültiger Hash eines Zufallswerts. Wird geprüft, wenn der Username nicht
// existiert, damit ein fehlgeschlagener Login timing-neutral bleibt (kein
// User-Enumeration über Antwortzeiten).
const DUMMY_HASH = 'pbkdf2$100000$MgQhDnrodrdIHIV/mixReQ==$JvKVib2ohwvund2hhfMsTzuKOZ0zlhGeHmHa8mFMx1U=';

export function findUser(username) {
  const u = String(username || '').trim().toLowerCase();
  return USERS.find((x) => x.username.toLowerCase() === u) || null;
}

/** Prüft Username+Passwort. Gibt den User zurück oder null (nie verraten, was falsch war). */
export async function authenticate(username, password) {
  const user = findUser(username);
  const ok = await verifyPassword(password, user ? user.hash : DUMMY_HASH);
  return user && ok ? user : null;
}

// ── Sessions (Opaque-Token in KV) ─────────────────────────────────────────────
const SESSION_TTL_S = 60 * 60 * 12; // 12 Stunden

async function kvKeyFor(token, secret) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(token));
  return 'sess:' + bytesToHex(new Uint8Array(sig));
}

export async function createSession(env, user) {
  if (!env.SESSION_SECRET) throw new Error('SESSION_SECRET not configured');
  const token = bytesToB64url(crypto.getRandomValues(new Uint8Array(32)));
  const kk = await kvKeyFor(token, env.SESSION_SECRET);
  const data = {
    u: user.username,
    role: user.role,
    site: user.site || null,
    exp: Date.now() + SESSION_TTL_S * 1000,
  };
  await env.ANALYTICS.put(kk, JSON.stringify(data), { expirationTtl: SESSION_TTL_S });
  return token;
}

export async function getSession(env, token) {
  if (!token || !env.SESSION_SECRET) return null;
  let kk;
  try { kk = await kvKeyFor(token, env.SESSION_SECRET); } catch { return null; }
  const raw = await env.ANALYTICS.get(kk);
  if (!raw) return null;
  let s;
  try { s = JSON.parse(raw); } catch { return null; }
  if (s.exp && s.exp < Date.now()) { await env.ANALYTICS.delete(kk); return null; }
  return s;
}

export async function destroySession(env, token) {
  if (!token || !env.SESSION_SECRET) return;
  try { await env.ANALYTICS.delete(await kvKeyFor(token, env.SESSION_SECRET)); } catch {}
}

export function bearerToken(request) {
  const a = request.headers.get('Authorization') || '';
  return a.startsWith('Bearer ') ? a.slice(7).trim() : '';
}

// ── Mandanten-Logik ───────────────────────────────────────────────────────────
export function sanitizeSite(slug) {
  if (!slug) return null;
  const s = String(slug).toLowerCase().replace(/[^a-z0-9-]/g, '');
  return s && Object.prototype.hasOwnProperty.call(SITES, s) ? s : null;
}

/**
 * Server-seitiger Fallback: leitet den Site-Slug aus dem page-Feld ab, falls der
 * Tracker (alte Version) noch kein explizites site-Feld sendet. Spiegelt die
 * getSiteKey()-Logik aus tracker.js. Default: 'elyesferchichi'.
 */
export function deriveSite(page) {
  const p = String(page || '').toLowerCase();
  if (p.includes('pizza') && p.includes('blitz')) return 'pizza-blitz';
  if (p.includes('antepli')) return 'antepli';
  if (p.includes('hevi')) return 'hevis';
  if (p.includes('bens')) return 'bens';
  if (p.includes('niki')) return 'cafeniki';
  if (p.includes('lokma')) return 'lokma';
  if (p.includes('starscape')) return 'starscape';
  if (p.includes('freelance')) return 'freelance';
  return 'elyesferchichi';
}

/**
 * Welche Site-Daten darf diese Session sehen?
 *   Master → per ?site= gewählte Site, oder null = ALLE (kein Filter).
 *   Kunde  → IMMER die eigene Site; ein ?site=-Param wird ignoriert (Server erzwingt).
 * Rückgabe: slug (filtern auf diese Site) | null (kein Filter, nur Master) .
 */
export function effectiveSite(session, url) {
  if (session.role === 'master') {
    const q = url.searchParams.get('site');
    if (!q || q === 'all' || q === '__all__') return null;
    return sanitizeSite(q); // ungültiger Slug → null (alle) statt Fehler
  }
  // Kunde: eigene Site erzwingen. Fehlt sie (sollte nie), auf einen unmöglichen
  // Wert setzen → liefert garantiert keine fremden Daten.
  return session.site || '__none__';
}

export function siteList() {
  return Object.entries(SITES).map(([slug, label]) => ({ slug, label }));
}

export { SITES, USERS };
