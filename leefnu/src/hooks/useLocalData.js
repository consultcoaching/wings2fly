import { useCallback, useEffect, useMemo, useState } from 'react';
import { EMPTY_LOCAL, clearLocal, loadLocal, saveLocal } from '../lib/storage';
import { MAX_JOURNAL, MAX_SESSIONS } from '../lib/config';
import { journalLimit } from '../lib/tiers';

export const DEFAULT_SETTINGS = {
  largeText: false,
  reducedMotion: false,
  haptics: true,
  voice: false,
  backupReminder: false,
  emergencyContact: '',
  lastProtocol: null, // laatst gekozen protocol, hersteld bij openen
  lastExportAt: null,
  niveauToken: null, // JWT (EdDSA) van de server; offline geverifieerd in useNiveau
  pendingPayment: null, // { paymentId, email, at } tussen checkout en token
};

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/** Eén bron voor alle lokale data (sessies, dagboek, instellingen).
 * Elke wijziging wordt direct weggeschreven; grote letters en verminderde
 * animatie worden als klasse op <html> gezet. */
export function useLocalData() {
  const [data, setData] = useState(loadLocal);
  const [saveFailed, setSaveFailed] = useState(false);

  const update = useCallback((mutate) => {
    setData((prev) => {
      const next = mutate(prev);
      setSaveFailed(!saveLocal(next));
      return next;
    });
  }, []);

  const settings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...data.settings }), [data.settings]);

  const setSetting = useCallback(
    (name, value) =>
      update((prev) => ({ ...prev, settings: { ...prev.settings, [name]: value } })),
    [update]
  );

  const addSession = useCallback(
    (session) =>
      update((prev) => ({
        ...prev,
        sessions: [...prev.sessions, { id: newId(), ...session }].slice(-MAX_SESSIONS),
      })),
    [update]
  );

  // Free bewaart de laatste 7 notities (dagboek_7); hogere niveaus tot MAX_JOURNAL.
  const addJournalEntry = useCallback(
    (entry) =>
      update((prev) => ({
        ...prev,
        journal: [{ id: newId(), at: new Date().toISOString(), ...entry }, ...prev.journal].slice(
          0,
          journalLimit() ?? MAX_JOURNAL
        ),
      })),
    [update]
  );

  const removeJournalEntry = useCallback(
    (id) => update((prev) => ({ ...prev, journal: prev.journal.filter((e) => e.id !== id) })),
    [update]
  );

  const clearAll = useCallback(() => {
    clearLocal();
    setData({ ...EMPTY_LOCAL, sessions: [], journal: [], settings: {} });
    setSaveFailed(false);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('large-text', Boolean(settings.largeText));
    root.classList.toggle('reduced-motion', Boolean(settings.reducedMotion));
  }, [settings.largeText, settings.reducedMotion]);

  return {
    data,
    settings,
    setSetting,
    addSession,
    addJournalEntry,
    removeJournalEntry,
    clearAll,
    saveFailed,
  };
}
