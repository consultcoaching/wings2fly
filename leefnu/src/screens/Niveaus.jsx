import { FEATURE_LABELS, TIERS, TIER_ORDER, currentTier } from '../lib/tiers';

/* Overzicht Free / Reset / Care. Alleen weergave: betaalde niveaus zijn nog
 * niet activeerbaar en tonen "Binnenkort", zoals in de live bundle. */
export default function Niveaus({ onBack }) {
  const current = currentTier();

  return (
    <main className="niveaus">
      <button type="button" className="back" onClick={onBack}>
        ‹ Terug
      </button>
      <h2 className="screen-title">Niveaus</h2>
      <p className="hint left">
        Noodhulp, ademhaling en grounding zijn altijd gratis. Betaalde niveaus komen later.
      </p>

      <div className="card-grid">
        {TIER_ORDER.map((id) => {
          const tier = TIERS[id];
          const isCurrent = id === current;
          return (
            <article
              key={id}
              className={`card tier ${isCurrent ? 'tier-current' : ''}`}
              style={{ borderLeftColor: tier.kleur }}
              aria-current={isCurrent ? 'true' : undefined}
            >
              <div className="tier-head">
                <strong className="tier-name">{tier.naam}</strong>
                <span className="tier-price">{tier.prijs}</span>
              </div>
              <ul className="tier-features">
                {FEATURE_LABELS[id].map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
              <span className={`tag ${isCurrent ? 'tag-current' : ''}`}>
                {isCurrent ? 'Huidig niveau' : 'Binnenkort'}
              </span>
            </article>
          );
        })}
      </div>
    </main>
  );
}
