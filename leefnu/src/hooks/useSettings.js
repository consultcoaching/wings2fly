import { useCallback, useEffect } from 'react';
import { KEYS } from '../lib/storage';
import { useStoredState } from './useStoredState';

export const DEFAULT_SETTINGS = {
  largeText: false,
  reducedMotion: false,
  haptics: true,
  voice: false,
};

/** Instellingen met persistentie; grote letters en verminderde animatie
 * worden als klasse op <html> gezet zodat CSS ze overal kan toepassen. */
export function useSettings() {
  const [settings, setSettings, resetSettings] = useStoredState(KEYS.settings, DEFAULT_SETTINGS);

  const setSetting = useCallback(
    (name, value) => setSettings((prev) => ({ ...prev, [name]: value })),
    [setSettings]
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('large-text', Boolean(settings.largeText));
    root.classList.toggle('reduced-motion', Boolean(settings.reducedMotion));
  }, [settings.largeText, settings.reducedMotion]);

  return { settings, setSetting, resetSettings };
}
