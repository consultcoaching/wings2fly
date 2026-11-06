import { useEffect, useRef, useState } from 'react';
import { exportAll, toTelHref } from '../lib/storage';

const CONFIRM_WINDOW_MS = 5000;

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function Instellingen({
  settings,
  setSetting,
  emergencyContact,
  setEmergencyContact,
  onClearAll,
}) {
  const [draftContact, setDraftContact] = useState(emergencyContact || '');
  const [contactStatus, setContactStatus] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const confirmTimer = useRef(null);

  useEffect(() => {
    setDraftContact(emergencyContact || '');
  }, [emergencyContact]);

  useEffect(() => () => clearTimeout(confirmTimer.current), []);

  const saveContact = (event) => {
    event.preventDefault();
    const trimmed = draftContact.trim();
    if (trimmed && !toTelHref(trimmed)) {
      setContactStatus('Voer een geldig telefoonnummer in.');
      return;
    }
    setEmergencyContact(trimmed);
    setContactStatus(trimmed ? 'Noodcontact opgeslagen.' : 'Noodcontact verwijderd.');
  };

  const handleClear = () => {
    if (!confirmClear) {
      // Twee stappen i.p.v. window.confirm(): werkt ook in iOS-standalone/webviews.
      setConfirmClear(true);
      confirmTimer.current = setTimeout(() => setConfirmClear(false), CONFIRM_WINDOW_MS);
      return;
    }
    clearTimeout(confirmTimer.current);
    setConfirmClear(false);
    onClearAll();
  };

  const voiceSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const hapticsSupported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

  return (
    <main className="instellingen">
      <h2 className="screen-title">Instellingen</h2>

      <section className="section-group" aria-labelledby="h-contact">
        <h3 id="h-contact">Persoonlijk noodcontact</h3>
        <form onSubmit={saveContact} className="field-row">
          <label htmlFor="contact" className="sr-only">
            Telefoonnummer noodcontact
          </label>
          <input
            id="contact"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className="field"
            placeholder="+32 4xx xx xx xx"
            value={draftContact}
            onChange={(event) => {
              setDraftContact(event.target.value);
              setContactStatus('');
            }}
          />
          <button type="submit" className="btn secondary">
            Opslaan
          </button>
        </form>
        <p className="hint" aria-live="polite">
          {contactStatus || 'Verschijnt als belknop op het noodscherm.'}
        </p>
      </section>

      <section className="section-group" aria-labelledby="h-a11y">
        <h3 id="h-a11y">Toegankelijkheid</h3>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.largeText}
            onChange={(event) => setSetting('largeText', event.target.checked)}
          />
          Grote letters
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(event) => setSetting('reducedMotion', event.target.checked)}
          />
          Verminderde animatie
        </label>
      </section>

      <section className="section-group" aria-labelledby="h-feedback">
        <h3 id="h-feedback">Begeleiding bij fasewissel</h3>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.haptics}
            onChange={(event) => setSetting('haptics', event.target.checked)}
          />
          Trilling {hapticsSupported ? '' : '(niet ondersteund op dit apparaat)'}
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.voice}
            onChange={(event) => setSetting('voice', event.target.checked)}
          />
          Stembegeleiding {voiceSupported ? '' : '(niet ondersteund op dit apparaat)'}
        </label>
      </section>

      <section className="section-group" aria-labelledby="h-data">
        <h3 id="h-data">Lokale gegevens</h3>
        <button
          type="button"
          className="btn secondary"
          onClick={() => downloadJSON(exportAll(), 'leefnu-export.json')}
        >
          Exporteer gegevens (JSON)
        </button>
        <button type="button" className="btn danger" onClick={handleClear}>
          {confirmClear ? 'Tik nogmaals om te bevestigen' : 'Verwijder alle gegevens'}
        </button>
        <p className="hint">Alles blijft op dit toestel. Er wordt niets naar een server gestuurd.</p>
      </section>
    </main>
  );
}
