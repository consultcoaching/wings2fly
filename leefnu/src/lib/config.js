/* Externe verwijzingen en limieten. Leeg = functie verborgen.
 * Bewust geen defaults: niets wordt verzonnen of stilzwijgend aangeroepen.
 * De app doet in deze versie GEEN netwerkverkeer buiten het laden van zichzelf. */

/** Volledige privacyverklaring. Leeg: link wordt niet getoond. */
export const PRIVACY_URL = '';

/** Backup-herinnering na dit aantal dagen zonder export (alleen bij opt-in). */
export const BACKUP_REMINDER_DAYS = 30;

/** Maximum aantal bewaarde ademsessies en dagboeknotities (oudste vallen af). */
export const MAX_SESSIONS = 500;
export const MAX_JOURNAL = 1000;

/** Sessies korter dan dit worden niet gelogd (per ongeluk gestart). */
export const MIN_SESSION_SECONDS = 5;
