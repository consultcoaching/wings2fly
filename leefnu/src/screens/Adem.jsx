import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_PROTOCOL, PHASES, PROTOCOLS, isProtocolKey } from '../lib/protocols';
import { MIN_SESSION_SECONDS } from '../lib/config';
import { canSpeak, canVibrate } from '../lib/device';
import { useBreathing } from '../hooks/useBreathing';
import BreathRings from '../components/BreathRings';

function speak(text) {
  if (!canSpeak()) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'nl-BE';
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

export default function Adem({ settings, autoStart = false, initialProtocol, onProtocolChange, onSession }) {
  const startKey = isProtocolKey(initialProtocol)
    ? initialProtocol
    : isProtocolKey(settings.lastProtocol)
      ? settings.lastProtocol
      : DEFAULT_PROTOCOL;

  const [running, setRunning] = useState(Boolean(autoStart));
  const [protocolKey, setProtocolKey] = useState(startKey);
  const protocol = PROTOCOLS[protocolKey];

  const onPhase = useCallback(
    (phase) => {
      if (settings.haptics && canVibrate()) navigator.vibrate(PHASES[phase].vibrate);
      if (settings.voice) speak(PHASES[phase].voice);
    },
    [settings.haptics, settings.voice]
  );

  const { phase, secondsLeft, phaseCount } = useBreathing({ protocol, running, onPhase });

  // Sessie loggen (lokaal) bij stoppen of verlaten van het scherm.
  const startedAtRef = useRef(null);
  const protocolRef = useRef(protocolKey);
  const onSessionRef = useRef(onSession);
  protocolRef.current = protocolKey;
  onSessionRef.current = onSession;

  const flushSession = useCallback(() => {
    const start = startedAtRef.current;
    if (!start) return;
    startedAtRef.current = null;
    const seconds = Math.round((Date.now() - start) / 1000);
    if (seconds >= MIN_SESSION_SECONDS) {
      onSessionRef.current?.({
        at: new Date(start).toISOString(),
        protocol: protocolRef.current,
        seconds,
      });
    }
  }, []);

  useEffect(() => {
    if (running) startedAtRef.current = Date.now();
    else flushSession();
  }, [running, flushSession]);

  useEffect(() => () => flushSession(), [flushSession]);

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
          const next = event.target.value;
          setRunning(false);
          setProtocolKey(next);
          onProtocolChange?.(next);
        }}
      >
        {Object.entries(PROTOCOLS).map(([key, value]) => (
          <option key={key} value={key}>
            {value.name}
          </option>
        ))}
      </select>

      <div className="circle-container">
        <BreathRings
          running={running}
          phase={phase}
          secondsLeft={secondsLeft}
          duration={protocol[phase]}
          phaseCount={phaseCount}
          reducedMotion={settings.reducedMotion}
          label={phaseLabel}
        />
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
