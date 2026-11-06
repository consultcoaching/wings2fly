/* Niveaus en features, overgenomen uit de live bundle (JSON van 2026-11-06).
 * Prijzen volgens besluit 2026-11-07: Reset is €49 eenmalig voor 12 maanden;
 * maandprijzen zijn van het scherm; Care heeft nog geen prijs (leeg = niet tonen).
 * Runtime: currentTier() geeft altijd 'free' terug; betaalde niveaus tonen
 * "Binnenkort". Een echte controle vereist een server-gekoppeld token.
 * Gating hier is dus alleen functioneel voor Free-limieten, nooit beveiliging. */

export const TIERS = {
  free: {
    id: 'free',
    naam: 'Free',
    prijs: 'Gratis',
    kleur: '#6DB89B',
    features: ['basis', 'adem', 'grounding', 'crisis', 'spraak', 'dagboek_7', 'acties_3', 'training_starter'],
  },
  reset: {
    id: 'reset',
    naam: 'Reset',
    prijs: '€49 eenmalig · 12 maanden',
    kleur: '#C8B87A',
    features: [
      'basis', 'adem', 'grounding', 'crisis', 'spraak', 'dagboek_7', 'acties_3', 'training_starter',
      'dagboek_onbeperkt', 'acties_alle', 'context_extra', 'weekpatroon', 'export', 'training_alle',
    ],
  },
  care: {
    id: 'care',
    naam: 'Care',
    prijs: '',
    kleur: '#B07BD4',
    features: [
      'basis', 'adem', 'grounding', 'crisis', 'spraak', 'dagboek_7', 'acties_3', 'training_starter',
      'dagboek_onbeperkt', 'acties_alle', 'context_extra', 'weekpatroon', 'export', 'training_alle',
      'pdf', 'coach_export', 'mantelzorger',
    ],
  },
};

export const TIER_ORDER = ['free', 'reset', 'care'];

export const FEATURE_LABELS = {
  free: [
    'Check-in · 8 staten',
    'Ademhaling (4 protocollen)',
    'Grounding (5-4-3-2-1)',
    '3 micro-acties',
    'Dagboek 7 entries',
    'Crisisprotocol',
    'Spraak (Piper · Vlaams)',
    'Training Starter',
  ],
  reset: [
    'Alles van Free',
    'Alle micro-acties',
    'Onbeperkt dagboek',
    'Weekpatroon',
    'JSON export',
    'Personalisatie profiel',
    'Context-acties',
    'Training Alle niveaus',
  ],
  care: [
    'Alles van Reset',
    'PDF rapport voor coach',
    'Coach-export',
    'Mantelzorger-modus',
    'Training Getraind',
  ],
};

/** Aantal dagboeknotities dat Free bewaart (oudste vallen af). */
export const JOURNAL_LIMIT_FREE = 7;

export function isTierKey(key) {
  return Object.prototype.hasOwnProperty.call(TIERS, key);
}

/* Actief niveau. Start op free; de app zet het na offline verificatie van het
 * niveau-token (useNiveau). Zonder TOKEN_PUBLIC_KEY blijft het altijd free. */
let actiefNiveau = 'free';

export function currentTier() {
  return actiefNiveau;
}

export function setCurrentTier(key) {
  actiefNiveau = isTierKey(key) ? key : 'free';
  return actiefNiveau;
}

export function hasFeature(feature, tier = currentTier()) {
  return TIERS[tier]?.features.includes(feature) ?? false;
}

/** null = onbeperkt. */
export function journalLimit(tier = currentTier()) {
  return hasFeature('dagboek_onbeperkt', tier) ? null : JOURNAL_LIMIT_FREE;
}
