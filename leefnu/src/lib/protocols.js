/* Ademprotocollen in seconden. hold: 0 betekent: fase wordt overgeslagen.
 * Tijden zijn gangbare, conservatieve varianten; inhoudelijk te toetsen.
 * Bewust niet instelbaar in de UI. */
export const PROTOCOLS = {
  'slow-paced': {
    name: 'Slow-paced (4-2-6)',
    short: 'Slow-paced',
    desc: 'Reguleert hartslagvariabiliteit (HRV).',
    inhale: 4,
    hold: 2,
    exhale: 6,
  },
  exhale: {
    name: 'Exhale (4-0-8)',
    short: 'Exhale',
    desc: 'Verlengde uitademing activeert de parasympathicus.',
    inhale: 4,
    hold: 0,
    exhale: 8,
  },
  sitkari: {
    name: 'Sitkari (5-5-5)',
    short: 'Sitkari',
    desc: 'Afkoelende ademhaling via de tanden.',
    inhale: 5,
    hold: 5,
    exhale: 5,
  },
  polyvagal: {
    name: 'Polyvagal (4-7-8)',
    short: 'Polyvagal',
    desc: 'Vaguszenuw-de-escalatie via 4-7-8 ritme.',
    inhale: 4,
    hold: 7,
    exhale: 8,
  },
};

export const DEFAULT_PROTOCOL = 'slow-paced';

export const PHASE_ORDER = ['inhale', 'hold', 'exhale'];

export const PHASES = {
  inhale: { label: 'Inademen', voice: 'Adem in', vibrate: [60] },
  hold: { label: 'Vasthouden', voice: 'Houd vast', vibrate: [30, 60, 30] },
  exhale: { label: 'Uitademen', voice: 'Adem uit', vibrate: [120] },
};

/** Fasen die in dit protocol daadwerkelijk voorkomen (duur > 0). */
export function phaseSequence(protocol) {
  return PHASE_ORDER.filter((phase) => protocol[phase] > 0);
}

export function isProtocolKey(key) {
  return Object.prototype.hasOwnProperty.call(PROTOCOLS, key);
}
