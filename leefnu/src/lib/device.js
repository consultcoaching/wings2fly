/* Capability-checks voor optionele begeleiding. Nooit aannemen, altijd testen. */
export const canVibrate = () =>
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;
