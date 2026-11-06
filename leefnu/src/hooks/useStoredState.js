import { useCallback, useState } from 'react';
import { readJSON, removeKey, writeJSON } from '../lib/storage';

/** useState met persistentie in localStorage. Objecten worden ondiep
 * samengevoegd met de fallback, zodat nieuwe instellingen een default krijgen.
 * Geeft [value, update, reset]; reset zet de fallback terug ZONDER te schrijven
 * en verwijdert de sleutel, zodat "alles wissen" ook echt leeg oplevert. */
export function useStoredState(key, fallback) {
  const [value, setValue] = useState(() => {
    const stored = readJSON(key, fallback);
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      return { ...fallback, ...stored };
    }
    return stored;
  });

  const update = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        writeJSON(key, resolved);
        return resolved;
      });
    },
    [key]
  );

  const reset = useCallback(() => {
    removeKey(key);
    setValue(fallback);
  }, [key, fallback]);

  return [value, update, reset];
}
