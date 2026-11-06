/* Externe verwijzingen en limieten. Leeg = functie verborgen.
 * Bewust geen defaults: niets wordt verzonnen of stilzwijgend aangeroepen. */

/** Volledige privacyverklaring. Leeg: link wordt niet getoond. */
export const PRIVACY_URL = '';

/** Publieke Ed25519-sleutel (hex, 32 bytes) waarmee de app niveau-tokens
 * offline controleert. Maken met leefnu/server/scripts/maak-sleutels.js.
 * Leeg: betalen en toegang ophalen zijn verborgen en iedereen is Free. */
export const TOKEN_PUBLIC_KEY = '';

/** Basis van de API (nginx-locatie /api/ → 127.0.0.1:8787). */
export const API_BASE = '/api';

/** Backup-herinnering na dit aantal dagen zonder export (alleen bij opt-in). */
export const BACKUP_REMINDER_DAYS = 30;

/** Maximum aantal bewaarde ademsessies en dagboeknotities (oudste vallen af). */
export const MAX_SESSIONS = 500;
export const MAX_JOURNAL = 1000;

/** Sessies korter dan dit worden niet gelogd (per ongeluk gestart). */
export const MIN_SESSION_SECONDS = 5;
