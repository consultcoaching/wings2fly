import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_PROTOCOL, PHASES, PROTOCOLS } from '../lib/protocols';
import { useBreathing } from '../hooks/useBreathing';

const canVibrate = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

function speak(text) {
  if (!canSpeak()) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'nl-NL';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch {
    /* stembegeleiding is optioneel; nooit laten crashen */
  }
}

function stopFeedback() {
  if (canVibrate()) navigator.vibrate(0);
  if (canSpeak()) window.speechSynthesis.cancel();
}

export default function Adem({ settings, autoStart = false }) {
  const [running, setRunning] = useState(Boolean(autoStart));
  const [protocolKey, setProtocolKey] = useState(DEFAULT_PROTOCOL);
  const protocol = PROTOCOLS[protocolKey];

  const onPhase = useCallback(
    (phase) => {
      if (settings.haptics && canVibrate()) navigator.vibrate(PHASES[phase].vibrate);
      if (settings.voice) speak(PHASES[phase].voice);
    },
    [settings.haptics, settings.voice]
  );

  const { phase, secondsLeft } = useBreathing({ protocol, running, onPhase });

  // Scherm op slot of tab naar de achtergrond: stoppen, zodat teller en
  // feedback nooit uit de pas lopen met wat de gebruiker ziet.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') setRunning(false);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Trilling en spraak stoppen bij stop en bij unmount (tabwissel).
  useEffect(() => {
    if (!running) stopFeedback();
    return stopFeedback;
  }, [running]);

  const phaseLabel = PHASES[phase].label;

  return (
    <main className="adem">
      <label className="selector-label" htmlFor="protocol">
        Ademprotocol
      </label>
      <select
        id="protocol"
        className="selector"
        value={protocolKey}
        onChange={(event) => {
          setRunning(false);
          setProtocolKey(event.target.value);
        }}
      >
        {Object.entries(PROTOCOLS).map(([key, value]) => (
          <option key={key} value={key}>
            {value.name}
          </option>
        ))}
      </select>

      <div className="circle-container">
        <div className={`circle ${running ? phase : ''}`} aria-hidden="true">
          <div className="circle-count">{running ? secondsLeft : 'Klaar'}</div>
          {running && <div className="phase-text">{phaseLabel}</div>}
        </div>
        {/* Aparte live-region: één rustige melding per fasewissel, niet per seconde. */}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {running ? `${phaseLabel}, ${protocol[phase]} seconden` : 'Oefening gestopt'}
        </p>
      </div>

      <button
        type="button"
        className={`btn ${running ? 'secondary' : ''}`}
        onClick={() => setRunning((prev) => !prev)}
        aria-pressed={running}
      >
        {running ? 'Stop' : 'Start'}
      </button>
    </main>
  );
}
