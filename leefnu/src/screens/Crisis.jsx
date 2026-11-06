import { useEffect, useRef } from 'react';
import { toTelHref } from '../lib/storage';

/* Noodscherm. Belknoppen zijn echte <a href="tel:"> zodat ze zonder JS-state
 * en zonder netwerk werken. Escape sluit het scherm. */
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

      <a href="tel:112" className="btn danger" ref={firstActionRef}>
        Bel 112 (spoed)
      </a>
      <a href="tel:1813" className="btn danger">
        Bel 1813 (Zelfmoordlijn)
      </a>

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

      <button type="button" className="btn secondary crisis-close" onClick={onClose}>
        Sluiten
      </button>
    </div>
  );
}
