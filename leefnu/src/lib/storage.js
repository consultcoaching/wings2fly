/* Lokale opslag van LeefNu: één sleutel, één structuur.
 *   leefnu-local = { sessions: [], journal: [], settings: {} }
 * Alles blijft op het toestel. Deze module doet geen netwerkverkeer. */
import { MAX_JOURNAL, MAX_SESSIONS } from './config';

export const STORAGE_KEY = 'leefnu-local';

export const EMPTY_LOCAL = Object.freeze({ sessions: [], journal: [], settings: {} });

function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return null; // privé-modus of geblokkeerde opslag: app werkt zonder persistentie
  }
}

function normalise(raw) {
  const data = raw && typeof raw === 'object' ? raw : {};
  return {
    sessions: Array.isArray(data.sessions) ? data.sessions.slice(-MAX_SESSIONS) : [],
    journal: Array.isArray(data.journal) ? data.journal.slice(0, MAX_JOURNAL) : [],
    settings: data.settings && typeof data.settings === 'object' ? data.settings : {},
  };
}

export function loadLocal() {
  const store = safeStorage();
  if (!store) return normalise(null);
  try {
    const raw = store.getItem(STORAGE_KEY);
    return normalise(raw ? JSON.parse(raw) : null);
  } catch {
    return normalise(null);
  }
}

/** Schrijft de volledige structuur weg. Geeft false bij quota- of toegangsfout. */
export function saveLocal(data) {
  const store = safeStorage();
  if (!store) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(normalise(data)));
    return true;
  } catch {
    return false;
  }
}

/** Exportobject voor een backup-bestand (JSON). */
export function exportLocal(data = loadLocal()) {
  return {
    app: 'LeefNu',
    format: 1,
    exportedAt: new Date().toISOString(),
    ...normalise(data),
  };
}

export function clearLocal() {
  const store = safeStorage();
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    /* niets te verwijderen */
  }
}

/** Zet een vrij ingevoerd nummer om naar een veilige tel:-href, of null. */
export function toTelHref(phone) {
  const clean = String(phone || '').replace(/[^\d+]/g, '');
  if (clean.length < 3) return null;
  return `tel:${clean}`;
}

export function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
