import { useEffect, useRef } from 'react';
import { toTelHref } from '../lib/storage';
import { CRISIS_LINES } from '../lib/crisisLines';

const PRIMARY = CRISIS_LINES.filter((line) => line.primary);
const OTHERS = CRISIS_LINES.filter((line) => !line.primary);

/* Noodscherm. Belknoppen zijn echte <a href="tel:"> zodat ze zonder JS-state
 * en zonder netwerk werken. Escape sluit het scherm. Geen netwerkverkeer. */
export default function Crisis({ onClose, onDirectBreathe, onOpenSettings, emergencyContact }) {
  const contactHref = toTelHref(emergencyContact);
  const firstActionRef = useRef(null);

  // In een crisis moet de eerste tik of Enter meteen bellen. React past
  // autoFocus niet toe op <a>, daarom expliciet via ref.
  useEffect(() => {
    firstActionRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="crisis" role="dialog" aria-modal="true" aria-labelledby="crisis-title">
      <h2 id="crisis-title" className="crisis-title">
        Noodhulp
      </h2>

      {PRIMARY.map((line, index) => (
        <a
          key={line.nr}
          href={toTelHref(line.nr)}
          className="btn danger line"
          ref={index === 0 ? firstActionRef : undefined}
        >
          <span className="line-nr">Bel {line.nr}</span>
          <span className="line-info">{line.naam}</span>
        </a>
      ))}

      {contactHref ? (
        <a href={contactHref} className="btn secondary">
          Bel noodcontact ({emergencyContact})
        </a>
      ) : (
        <button type="button" className="btn secondary" onClick={onOpenSettings}>
          Noodcontact instellen
        </button>
      )}

      <div className="crisis-breathe">
        <p className="hint">Direct kalmeren zonder bellen:</p>
        <button type="button" className="btn" onClick={onDirectBreathe}>
          Start kalmerende adem
        </button>
      </div>

      <h3 className="group-title">Andere lijnen</h3>
      <ul className="line-list">
        {OTHERS.map((line) => (
          <li key={line.nr}>
            <a href={toTelHref(line.nr)} className="line-item">
              <span className="line-nr">{line.nr}</span>
              <span className="line-text">
                <span className="line-name">{line.naam}</span>
                <span className="line-info">{line.info}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      <button type="button" className="btn secondary crisis-close" onClick={onClose}>
        Sluiten
      </button>
    </div>
  );
}
