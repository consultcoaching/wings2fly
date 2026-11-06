import { useEffect, useRef, useState } from 'react';
import { journalLimit } from '../lib/tiers';

const MOODS = [
  { value: 1, label: 'Heel slecht' },
  { value: 2, label: 'Slecht' },
  { value: 3, label: 'Neutraal' },
  { value: 4, label: 'Goed' },
  { value: 5, label: 'Heel goed' },
];

const moodLabel = (value) => MOODS.find((m) => m.value === value)?.label ?? '';

const formatDate = (iso) => {
  try {
    return new Intl.DateTimeFormat('nl-BE', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso)
    );
  } catch {
    return iso;
  }
};

/* Lokaal dagboek: stemming (1-5) en optionele notitie over triggers.
 * Niets verlaat het toestel. */
export default function Dagboek({ entries, onAdd, onRemove, onBack }) {
  const [mood, setMood] = useState(null);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const deleteTimer = useRef(null);

  useEffect(() => () => clearTimeout(deleteTimer.current), []);

  const save = (event) => {
    event.preventDefault();
    if (!mood) {
      setStatus('Kies eerst hoe je je voelt.');
      return;
    }
    onAdd({ mood, note: note.trim() });
    setMood(null);
    setNote('');
    setStatus('Opgeslagen op dit toestel.');
  };

  const requestDelete = (id) => {
    if (pendingDelete === id) {
      clearTimeout(deleteTimer.current);
      setPendingDelete(null);
      onRemove(id);
      return;
    }
    clearTimeout(deleteTimer.current);
    setPendingDelete(id);
    deleteTimer.current = setTimeout(() => setPendingDelete(null), 5000);
  };

  return (
    <main className="dagboek">
      <button type="button" className="back" onClick={onBack}>
        ‹ Terug
      </button>
      <h2 className="screen-title">Dagboek</h2>

      <form onSubmit={save} className="section-group">
        <h3>Hoe voel je je nu?</h3>
        <div className="mood-row" role="radiogroup" aria-label="Stemming">
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={mood === m.value}
              className={`mood ${mood === m.value ? 'selected' : ''}`}
              onClick={() => {
                setMood(m.value);
                setStatus('');
              }}
            >
              <span className="mood-value">{m.value}</span>
              <span className="mood-label">{m.label}</span>
            </button>
          ))}
        </div>
        <label htmlFor="note" className="selector-label">
          Wat speelde er? (optioneel)
        </label>
        <textarea
          id="note"
          className="field textarea"
          rows={3}
          maxLength={2000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Triggers, gedachten, wat hielp…"
        />
        <button type="submit" className="btn">
          Opslaan
        </button>
        <p className="hint left" aria-live="polite">
          {status || 'Blijft op dit toestel. Er wordt niets verzonden.'}
        </p>
      </form>

      <section className="section-group" aria-labelledby="h-entries">
        <h3 id="h-entries">Eerdere notities ({entries.length})</h3>
        {journalLimit() && (
          <p className="hint left">
            Free bewaart je laatste {journalLimit()} notities; oudere vallen af. Maak een backup via
            Instellingen als je ze wilt bewaren.
          </p>
        )}
        {entries.length === 0 && <p className="hint left">Nog geen notities.</p>}
        <ul className="entry-list">
          {entries.map((entry) => (
            <li key={entry.id} className="card entry">
              <div className="entry-head">
                <span className="entry-mood">{entry.mood} · {moodLabel(entry.mood)}</span>
                <time className="entry-date" dateTime={entry.at}>
                  {formatDate(entry.at)}
                </time>
              </div>
              {entry.note && <p className="entry-note">{entry.note}</p>}
              <button type="button" className="link danger-link" onClick={() => requestDelete(entry.id)}>
                {pendingDelete === entry.id ? 'Tik nogmaals om te verwijderen' : 'Verwijder'}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
