import { useEffect, useRef, useState } from 'react';
import { downloadJSON, exportLocal, toTelHref } from '../lib/storage';
import { BACKUP_REMINDER_DAYS } from '../lib/config';
import { canSpeak, canVibrate } from '../lib/device';
import { TIERS, currentTier } from '../lib/tiers';

const CONFIRM_WINDOW_MS = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;

function backupDue(settings) {
  if (!settings.backupReminder) return false;
  if (!settings.lastExportAt) return true;
  return Date.now() - new Date(settings.lastExportAt).getTime() > BACKUP_REMINDER_DAYS * DAY_MS;
}

export default function Instellingen({
  data,
  settings,
  setSetting,
  onClearAll,
  onOpenPrivacy,
  onOpenNiveaus,
  saveFailed,
}) {
  const tier = TIERS[currentTier()];
  const [draftContact, setDraftContact] = useState(settings.emergencyContact || '');
  const [contactStatus, setContactStatus] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearStatus, setClearStatus] = useState('');
  const confirmTimer = useRef(null);

  useEffect(() => {
    setDraftContact(settings.emergencyContact || '');
  }, [settings.emergencyContact]);

  useEffect(() => () => clearTimeout(confirmTimer.current), []);

  const saveContact = (event) => {
    event.preventDefault();
    const trimmed = draftContact.trim();
    if (trimmed && !toTelHref(trimmed)) {
      setContactStatus('Voer een geldig telefoonnummer in.');
      return;
    }
    setSetting('emergencyContact', trimmed);
    setContactStatus(trimmed ? 'Noodcontact opgeslagen.' : 'Noodcontact verwijderd.');
  };

  const exportBackup = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadJSON(exportLocal(data), `leefnu-backup-${stamp}.json`);
    setSetting('lastExportAt', new Date().toISOString());
  };

  const handleClear = () => {
    if (!confirmClear) {
      // Twee stappen i.p.v. window.confirm(): werkt ook in iOS-standalone/webviews.
      setConfirmClear(true);
      setClearStatus('');
      confirmTimer.current = setTimeout(() => setConfirmClear(false), CONFIRM_WINDOW_MS);
      return;
    }
    clearTimeout(confirmTimer.current);
    setConfirmClear(false);
    onClearAll();
    setClearStatus('Alle lokale gegevens zijn gewist.');
  };

  const sessionCount = data.sessions.length;
  const journalCount = data.journal.length;

  return (
    <main className="instellingen">
      <h2 className="screen-title">Instellingen</h2>

      {saveFailed && (
        <p className="notice warn" role="alert">
          Opslaan lukt niet op dit toestel (opslag vol of geblokkeerd). Wijzigingen gaan verloren bij
          sluiten.
        </p>
      )}

      <section className="section-group" aria-labelledby="h-niveau">
        <h3 id="h-niveau">Niveau</h3>
        <p className="body">
          Je gebruikt <strong style={{ color: tier.kleur }}>{tier.naam}</strong>
          {tier.prijs ? ` (${tier.prijs})` : ''}.
        </p>
        <button type="button" className="btn secondary" onClick={onOpenNiveaus}>
          Bekijk niveaus
        </button>
      </section>

      <section className="section-group" aria-labelledby="h-data">
        <h3 id="h-data">Lokale gegevens</h3>
        <p className="hint left">
          {sessionCount} ademsessie{sessionCount === 1 ? '' : 's'}, {journalCount} dagboeknotitie
          {journalCount === 1 ? '' : 's'}. Alles staat alleen op dit toestel.
        </p>
        {backupDue(settings) && (
          <p className="notice" role="status">
            Het is {settings.lastExportAt ? `meer dan ${BACKUP_REMINDER_DAYS} dagen geleden` : 'nog niet gebeurd'}:
            maak een backup.
          </p>
        )}
        <button type="button" className="btn secondary" onClick={exportBackup}>
          Exporteer backup (JSON)
        </button>
        <button type="button" className="btn danger" onClick={handleClear}>
          {confirmClear ? 'Tik nogmaals om te bevestigen' : 'Verwijder alles'}
        </button>
        {clearStatus && (
          <p className="hint left" role="status">
            {clearStatus}
          </p>
        )}
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.backupReminder}
            onChange={(event) => setSetting('backupReminder', event.target.checked)}
          />
          Herinner me aan een backup (elke {BACKUP_REMINDER_DAYS} dagen)
        </label>
      </section>

      <section className="section-group" aria-labelledby="h-a11y">
        <h3 id="h-a11y">Toegankelijkheid</h3>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.largeText}
            onChange={(event) => setSetting('largeText', event.target.checked)}
          />
          Grote tekst
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
        <h3 id="h-feedback">Begeleiding</h3>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.voice}
            onChange={(event) => setSetting('voice', event.target.checked)}
          />
          Stem {canSpeak() ? '' : '(niet ondersteund op dit toestel)'}
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.haptics}
            onChange={(event) => setSetting('haptics', event.target.checked)}
          />
          Trilling {canVibrate() ? '' : '(niet ondersteund op dit toestel)'}
        </label>
      </section>

      <section className="section-group" aria-labelledby="h-contact">
        <h3 id="h-contact">Noodcontact</h3>
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
        <p className="hint left" aria-live="polite">
          {contactStatus || 'Verschijnt als belknop op het noodscherm.'}
        </p>
      </section>

      <section className="section-group" aria-labelledby="h-privacy">
        <h3 id="h-privacy">Privacy</h3>
        <p className="body">
          Alles blijft op dit toestel. Op de server staan alleen je contactgegevens en betalingsstatus.
          Geen sync, geen analytics.
        </p>
        <button type="button" className="btn secondary" onClick={onOpenPrivacy}>
          Lees de volledige uitleg
        </button>
      </section>
    </main>
  );
}
