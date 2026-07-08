#!/usr/bin/env node
/**
 * Passwort-Hash-Generator für die Analytics-Logins (PBKDF2-HMAC-SHA256).
 *
 * Erzeugt einen fertigen Hash-String zum Reinkopieren in  auth-config.js .
 * Du gibst NUR das Klartext-Passwort ein – gehasht wird hier, das Klartext-
 * Passwort verlässt nie deinen Rechner und landet nie im Code.
 *
 * Nutzung:
 *   node hash-password.mjs                 → fragt interaktiv nach dem Passwort
 *   node hash-password.mjs "meinPasswort"  → nimmt das Passwort als Argument
 *
 * Der erzeugte Hash hat das Format:
 *   pbkdf2$<iterationen>$<salt-base64>$<hash-base64>
 * und wird vom Worker (WebCrypto) mit exakt denselben Parametern geprüft.
 */
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';

const ITERATIONS = 210000;   // OWASP-Empfehlung 2023 für PBKDF2-HMAC-SHA256
const KEYLEN     = 32;       // 256-bit abgeleiteter Schlüssel
const DIGEST     = 'sha256';

function hashPassword(password) {
  const salt = randomBytes(16);
  const dk   = pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST);
  return `pbkdf2$${ITERATIONS}$${salt.toString('base64')}$${dk.toString('base64')}`;
}

const argPw = process.argv[2];

if (argPw != null) {
  process.stdout.write(hashPassword(argPw) + '\n');
  process.exit(0);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.question('Passwort: ', (pw) => {
  rl.close();
  if (!pw) {
    process.stderr.write('Kein Passwort eingegeben – abgebrochen.\n');
    process.exit(1);
  }
  process.stdout.write('\nHash (in auth-config.js beim jeweiligen User als "hash" einfügen):\n');
  process.stdout.write(hashPassword(pw) + '\n');
});
