/* Alle lokale opslag van LeefNu zit onder één prefix, zodat exporteren en
 * wissen nooit data van andere apps op dezelfde origin raken. */
const PREFIX = 'leefnu.';

export const KEYS = {
  settings: `${PREFIX}settings`,
  contact: `${PREFIX}noodcontact`,
};

function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return null; // privé-modus of geblokkeerde opslag: app blijft werken zonder persistentie
  }
}

export function readJSON(key, fallback) {
  const store = safeStorage();
  if (!store) return fallback;
  try {
    const raw = store.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  const store = safeStorage();
  if (!store) return false;
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key) {
  const store = safeStorage();
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    /* niets te verwijderen */
  }
}

export function exportAll() {
  const store = safeStorage();
  const data = {};
  if (!store) return data;
  for (let i = 0; i < store.length; i += 1) {
    const key = store.key(i);
    if (key && key.startsWith(PREFIX)) {
      data[key] = readJSON(key, null);
    }
  }
  return data;
}

export function clearAll() {
  const store = safeStorage();
  if (!store) return;
  const toRemove = [];
  for (let i = 0; i < store.length; i += 1) {
    const key = store.key(i);
    if (key && key.startsWith(PREFIX)) toRemove.push(key);
  }
  toRemove.forEach((key) => store.removeItem(key));
}

/** Zet een vrij ingevoerd nummer om naar een veilige tel:-href, of null. */
export function toTelHref(phone) {
  const clean = String(phone || '').replace(/[^\d+]/g, '');
  if (clean.length < 3) return null;
  return `tel:${clean}`;
}
