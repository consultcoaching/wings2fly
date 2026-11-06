/* Ademprotocollen in seconden. hold: 0 betekent: fase wordt overgeslagen.
 * Tijden zijn gangbare, conservatieve varianten – pas aan in overleg met
 * de inhoudelijk verantwoordelijke; ze zijn bewust niet instelbaar in de UI. */
export const PROTOCOLS = {
  'slow-paced': { name: 'Slow-paced (4-2-6)', inhale: 4, hold: 2, exhale: 6 },
  exhale: { name: 'Exhale focus (4-0-8)', inhale: 4, hold: 0, exhale: 8 },
  sitkari: { name: 'Sitkari (5-5-5)', inhale: 5, hold: 5, exhale: 5 },
  polyvagal: { name: 'Polyvagal reset (4-7-8)', inhale: 4, hold: 7, exhale: 8 },
};

export const DEFAULT_PROTOCOL = 'slow-paced';

export const PHASE_ORDER = ['inhale', 'hold', 'exhale'];

export const PHASES = {
  inhale: { label: 'Adem in', voice: 'Adem in', vibrate: [60] },
  hold: { label: 'Houd vast', voice: 'Houd vast', vibrate: [30, 60, 30] },
  exhale: { label: 'Adem uit', voice: 'Adem uit', vibrate: [120] },
};

/** Fasen die in dit protocol daadwerkelijk voorkomen (duur > 0). */
export function phaseSequence(protocol) {
  return PHASE_ORDER.filter((phase) => protocol[phase] > 0);
}
