import { useState } from 'react';
import { GROUNDING_STEPS } from '../lib/grounding';

/* Stap voor stap door 5-4-3-2-1. Geen invoer: benoemen in gedachten of hardop. */
export default function Grounding({ onBack }) {
  const [index, setIndex] = useState(0);
  const done = index >= GROUNDING_STEPS.length;
  const step = GROUNDING_STEPS[Math.min(index, GROUNDING_STEPS.length - 1)];

  return (
    <main className="grounding">
      <button type="button" className="back" onClick={onBack}>
        ‹ Terug
      </button>
      <h2 className="screen-title">Grounding 5-4-3-2-1</h2>

      {done ? (
        <div className="step-card" aria-live="polite">
          <div className="step-count">✓</div>
          <p className="step-prompt">Je bent hier. Nu.</p>
          <p className="hint">Neem nog één rustige ademhaling.</p>
          <button type="button" className="btn" onClick={() => setIndex(0)}>
            Opnieuw
          </button>
          <button type="button" className="btn secondary" onClick={onBack}>
            Klaar
          </button>
        </div>
      ) : (
        <div className="step-card" aria-live="polite">
          <p className="step-progress">
            Stap {index + 1} van {GROUNDING_STEPS.length}
          </p>
          <div className="step-count">{step.count}</div>
          <p className="step-prompt">{step.prompt}</p>
          <p className="hint">{step.hint}</p>
          <button type="button" className="btn" onClick={() => setIndex((i) => i + 1)}>
            {index === GROUNDING_STEPS.length - 1 ? 'Afronden' : 'Volgende'}
          </button>
          {index > 0 && (
            <button type="button" className="btn secondary" onClick={() => setIndex((i) => i - 1)}>
              Vorige
            </button>
          )}
        </div>
      )}
    </main>
  );
}
