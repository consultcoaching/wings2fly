/* Grounding 5-4-3-2-1: standaard zintuiglijke heroriëntatie.
 * Geen invoer vereist: de gebruiker benoemt in gedachten of hardop. */
export const GROUNDING_STEPS = [
  { count: 5, sense: 'zien', prompt: 'Benoem 5 dingen die je ziet.', hint: 'Groot of klein. Kijk rustig rond.' },
  { count: 4, sense: 'voelen', prompt: 'Benoem 4 dingen die je voelt.', hint: 'Je voeten op de grond, de stof van je kleren, de lucht op je huid.' },
  { count: 3, sense: 'horen', prompt: 'Benoem 3 dingen die je hoort.', hint: 'Dichtbij en veraf. Ook je eigen ademhaling telt.' },
  { count: 2, sense: 'ruiken', prompt: 'Benoem 2 dingen die je ruikt.', hint: 'Lukt het niet? Denk aan twee geuren die je graag hebt.' },
  { count: 1, sense: 'proeven', prompt: 'Benoem 1 ding dat je proeft.', hint: 'Of neem een slok water en let op de smaak.' },
];
