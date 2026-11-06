/* LeefNu – "Geheel": de volledige app in één bestand.
 *
 * GEGENEREERD door scripts/build-geheel.mjs uit ../src. Niet met de hand
 * bewerken: wijzig src/ en draai `npm run geheel`. Bedoeld voor een
 * canvas/preview zonder bundler (default export = App). Bevat geen service
 * worker: die vereist een apart bestand (zie ../public/sw.js).
 *
 * Gebruik: import LeefNu from './LeefNu.jsx'; <LeefNu />
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ============================== lib/config.js ============================== */
/* Externe verwijzingen en limieten. Leeg = functie verborgen.
 * Bewust geen defaults: niets wordt verzonnen of stilzwijgend aangeroepen.
 * De app doet in deze versie GEEN netwerkverkeer buiten het laden van zichzelf. */

/** Volledige privacyverklaring. Leeg: link wordt niet getoond. */
const PRIVACY_URL = '';

/** Backup-herinnering na dit aantal dagen zonder export (alleen bij opt-in). */
const BACKUP_REMINDER_DAYS = 30;

/** Maximum aantal bewaarde ademsessies en dagboeknotities (oudste vallen af). */
const MAX_SESSIONS = 500;
const MAX_JOURNAL = 1000;

/** Sessies korter dan dit worden niet gelogd (per ongeluk gestart). */
const MIN_SESSION_SECONDS = 5;

/* ============================== lib/device.js ============================== */
/* Capability-checks voor optionele begeleiding. Nooit aannemen, altijd testen. */
const canVibrate = () =>
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

/* ============================== lib/storage.js ============================== */
/* Lokale opslag van LeefNu: één sleutel, één structuur.
 *   leefnu-local = { sessions: [], journal: [], settings: {} }
 * Alles blijft op het toestel. Deze module doet geen netwerkverkeer. */

const STORAGE_KEY = 'leefnu-local';

const EMPTY_LOCAL = Object.freeze({ sessions: [], journal: [], settings: {} });

function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return null; // privé-modus of geblokkeerde opslag: app werkt zonder persistentie
  }
}

function normalise(raw) {
  const data = raw && typeof raw === 'object' ? raw : {};
  return {
    sessions: Array.isArray(data.sessions) ? data.sessions.slice(-MAX_SESSIONS) : [],
    journal: Array.isArray(data.journal) ? data.journal.slice(0, MAX_JOURNAL) : [],
    settings: data.settings && typeof data.settings === 'object' ? data.settings : {},
  };
}

function loadLocal() {
  const store = safeStorage();
  if (!store) return normalise(null);
  try {
    const raw = store.getItem(STORAGE_KEY);
    return normalise(raw ? JSON.parse(raw) : null);
  } catch {
    return normalise(null);
  }
}

/** Schrijft de volledige structuur weg. Geeft false bij quota- of toegangsfout. */
function saveLocal(data) {
  const store = safeStorage();
  if (!store) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(normalise(data)));
    return true;
  } catch {
    return false;
  }
}

/** Exportobject voor een backup-bestand (JSON). */
function exportLocal(data = loadLocal()) {
  return {
    app: 'LeefNu',
    format: 1,
    exportedAt: new Date().toISOString(),
    ...normalise(data),
  };
}

function clearLocal() {
  const store = safeStorage();
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    /* niets te verwijderen */
  }
}

/** Zet een vrij ingevoerd nummer om naar een veilige tel:-href, of null. */
function toTelHref(phone) {
  const clean = String(phone || '').replace(/[^\d+]/g, '');
  if (clean.length < 3) return null;
  return `tel:${clean}`;
}

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

/* ============================== lib/protocols.js ============================== */
/* Ademprotocollen in seconden. hold: 0 betekent: fase wordt overgeslagen.
 * Tijden zijn gangbare, conservatieve varianten; inhoudelijk te toetsen.
 * Bewust niet instelbaar in de UI. */
const PROTOCOLS = {
  'slow-paced': {
    name: 'Slow-paced (4-2-6)',
    short: 'Slow-paced',
    desc: 'Reguleert hartslagvariabiliteit (HRV).',
    inhale: 4,
    hold: 2,
    exhale: 6,
  },
  exhale: {
    name: 'Exhale (4-0-8)',
    short: 'Exhale',
    desc: 'Verlengde uitademing activeert de parasympathicus.',
    inhale: 4,
    hold: 0,
    exhale: 8,
  },
  sitkari: {
    name: 'Sitkari (5-5-5)',
    short: 'Sitkari',
    desc: 'Afkoelende ademhaling via de tanden.',
    inhale: 5,
    hold: 5,
    exhale: 5,
  },
  polyvagal: {
    name: 'Polyvagal (4-7-8)',
    short: 'Polyvagal',
    desc: 'Vaguszenuw-de-escalatie via 4-7-8 ritme.',
    inhale: 4,
    hold: 7,
    exhale: 8,
  },
};

const DEFAULT_PROTOCOL = 'slow-paced';

const PHASE_ORDER = ['inhale', 'hold', 'exhale'];

const PHASES = {
  inhale: { label: 'Inademen', voice: 'Adem in', vibrate: [60] },
  hold: { label: 'Vasthouden', voice: 'Houd vast', vibrate: [30, 60, 30] },
  exhale: { label: 'Uitademen', voice: 'Adem uit', vibrate: [120] },
};

/** Fasen die in dit protocol daadwerkelijk voorkomen (duur > 0). */
function phaseSequence(protocol) {
  return PHASE_ORDER.filter((phase) => protocol[phase] > 0);
}

function isProtocolKey(key) {
  return Object.prototype.hasOwnProperty.call(PROTOCOLS, key);
}

/* ============================== lib/grounding.js ============================== */
/* Grounding 5-4-3-2-1: standaard zintuiglijke heroriëntatie.
 * Geen invoer vereist: de gebruiker benoemt in gedachten of hardop. */
const GROUNDING_STEPS = [
  { count: 5, sense: 'zien', prompt: 'Benoem 5 dingen die je ziet.', hint: 'Groot of klein. Kijk rustig rond.' },
  { count: 4, sense: 'voelen', prompt: 'Benoem 4 dingen die je voelt.', hint: 'Je voeten op de grond, de stof van je kleren, de lucht op je huid.' },
  { count: 3, sense: 'horen', prompt: 'Benoem 3 dingen die je hoort.', hint: 'Dichtbij en veraf. Ook je eigen ademhaling telt.' },
  { count: 2, sense: 'ruiken', prompt: 'Benoem 2 dingen die je ruikt.', hint: 'Lukt het niet? Denk aan twee geuren die je graag hebt.' },
  { count: 1, sense: 'proeven', prompt: 'Benoem 1 ding dat je proeft.', hint: 'Of neem een slok water en let op de smaak.' },
];

/* ============================== hooks/useLocalData.js ============================== */
const DEFAULT_SETTINGS = {
  largeText: false,
  reducedMotion: false,
  haptics: true,
  voice: false,
  backupReminder: false,
  emergencyContact: '',
  lastProtocol: null, // laatst gekozen protocol, hersteld bij openen
  lastExportAt: null,
};

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/** Eén bron voor alle lokale data (sessies, dagboek, instellingen).
 * Elke wijziging wordt direct weggeschreven; grote letters en verminderde
 * animatie worden als klasse op <html> gezet. */
function useLocalData() {
  const [data, setData] = useState(loadLocal);
  const [saveFailed, setSaveFailed] = useState(false);

  const update = useCallback((mutate) => {
    setData((prev) => {
      const next = mutate(prev);
      setSaveFailed(!saveLocal(next));
      return next;
    });
  }, []);

  const settings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...data.settings }), [data.settings]);

  const setSetting = useCallback(
    (name, value) =>
      update((prev) => ({ ...prev, settings: { ...prev.settings, [name]: value } })),
    [update]
  );

  const addSession = useCallback(
    (session) =>
      update((prev) => ({
        ...prev,
        sessions: [...prev.sessions, { id: newId(), ...session }].slice(-MAX_SESSIONS),
      })),
    [update]
  );

  const addJournalEntry = useCallback(
    (entry) =>
      update((prev) => ({
        ...prev,
        journal: [{ id: newId(), at: new Date().toISOString(), ...entry }, ...prev.journal].slice(
          0,
          MAX_JOURNAL
        ),
      })),
    [update]
  );

  const removeJournalEntry = useCallback(
    (id) => update((prev) => ({ ...prev, journal: prev.journal.filter((e) => e.id !== id) })),
    [update]
  );

  const clearAll = useCallback(() => {
    clearLocal();
    setData({ ...EMPTY_LOCAL, sessions: [], journal: [], settings: {} });
    setSaveFailed(false);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('large-text', Boolean(settings.largeText));
    root.classList.toggle('reduced-motion', Boolean(settings.reducedMotion));
  }, [settings.largeText, settings.reducedMotion]);

  return {
    data,
    settings,
    setSetting,
    addSession,
    addJournalEntry,
    removeJournalEntry,
    clearAll,
    saveFailed,
  };
}

/* ============================== hooks/useOnline.js ============================== */
/** navigator.onLine met live updates. Onbekend (geen navigator) telt als online. */
function useOnline() {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine !== false
  );

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  return online;
}

/* ============================== hooks/useBreathing.js ============================== */
/** Ademmotor. Tikt per seconde, wisselt fasen volgens het protocol en roept
 * onPhase(phase) aan bij elke fasewissel (ook bij start). phaseCount telt
 * fasewissels zodat de UI een animatie per fase opnieuw kan starten.
 * De interval wordt altijd opgeruimd: bij stoppen, protocolwissel en unmount. */
function useBreathing({ protocol, running, onPhase }) {
  const initialPhase = phaseSequence(protocol)[0];
  const [state, setState] = useState({
    phase: initialPhase,
    secondsLeft: protocol[initialPhase],
    phaseCount: 0,
  });

  // Callback via ref, zodat een nieuwe functie-identiteit de timer niet herstart.
  const onPhaseRef = useRef(onPhase);
  useEffect(() => {
    onPhaseRef.current = onPhase;
  }, [onPhase]);

  useEffect(() => {
    const sequence = phaseSequence(protocol);
    if (sequence.length === 0) return undefined;

    if (!running) {
      setState({ phase: sequence[0], secondsLeft: protocol[sequence[0]], phaseCount: 0 });
      return undefined;
    }

    let index = 0;
    let secondsLeft = protocol[sequence[0]];
    let phaseCount = 1;
    setState({ phase: sequence[0], secondsLeft, phaseCount });
    onPhaseRef.current?.(sequence[0]);

    const timer = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        index = (index + 1) % sequence.length;
        secondsLeft = protocol[sequence[index]];
        phaseCount += 1;
        onPhaseRef.current?.(sequence[index]);
      }
      setState({ phase: sequence[index], secondsLeft, phaseCount });
    }, 1000);

    return () => clearInterval(timer);
  }, [running, protocol]);

  return state;
}

/* ============================== components/BreathRings.jsx ============================== */
const SIZE = 240;
const CENTER = SIZE / 2;
const PROGRESS_R = 112;
const CIRCUMFERENCE = 2 * Math.PI * PROGRESS_R;
const RINGS = [
  { r: 104, opacity: 0.35 },
  { r: 84, opacity: 0.55 },
  { r: 64, opacity: 0.8 },
];

/* Drie concentrische ringen die meeademen, een progress-ring die de fase
 * aftelt, en centraal teller + fase. Animatieduur = faseduur, zodat de
 * beweging zelf het tempo aangeeft. Bij verminderde animatie: ringen
 * statisch, progress-ring stapt per seconde zonder overgang. */
function BreathRings({
  running,
  phase,
  secondsLeft,
  duration,
  phaseCount,
  reducedMotion,
  label,
}) {
  const stateClass = running ? phase : 'idle';
  const safeDuration = Math.max(duration || 1, 1);
  const elapsed = running ? safeDuration - secondsLeft : 0;
  const staticOffset = CIRCUMFERENCE * (1 - elapsed / safeDuration);

  const progressStyle = reducedMotion
    ? { strokeDashoffset: staticOffset }
    : running
      ? { animation: `ring-progress ${safeDuration}s linear forwards` }
      : { strokeDashoffset: CIRCUMFERENCE };

  return (
    <div className={`breath ${stateClass}`} aria-hidden="true">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="breath-svg">
        <circle
          className="breath-track"
          cx={CENTER}
          cy={CENTER}
          r={PROGRESS_R}
          fill="none"
          strokeWidth="6"
        />
        <circle
          key={`${phaseCount}-${running ? 'run' : 'idle'}`}
          className="breath-progress"
          cx={CENTER}
          cy={CENTER}
          r={PROGRESS_R}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          style={progressStyle}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
        />
        <g className="breath-rings" style={{ transitionDuration: `${safeDuration}s` }}>
          {RINGS.map((ring) => (
            <circle
              key={ring.r}
              cx={CENTER}
              cy={CENTER}
              r={ring.r}
              fill="none"
              strokeWidth="2"
              style={{ opacity: ring.opacity }}
            />
          ))}
        </g>
      </svg>
      <div className="breath-center">
        <div className="breath-count">{running ? secondsLeft : 'Klaar'}</div>
        {running && <div className="breath-phase">{label}</div>}
      </div>
    </div>
  );
}

/* ============================== screens/Crisis.jsx ============================== */
/* Noodscherm. Belknoppen zijn echte <a href="tel:"> zodat ze zonder JS-state
 * en zonder netwerk werken. Escape sluit het scherm. Geen netwerkverkeer. */
function Crisis({ onClose, onDirectBreathe, onOpenSettings, emergencyContact }) {
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
        Bel 112
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

/* ============================== screens/Start.jsx ============================== */
function Start({ onAdem }) {
  return (
    <main className="start">
      <div className="circle-container start-circle">
        <button
          type="button"
          className="circle-btn"
          onClick={onAdem}
          aria-label="Adem nu: direct starten met ademhaling"
        >
          Adem nu
        </button>
      </div>
      <p className="hint">Eén tik om te kalmeren.</p>
    </main>
  );
}

/* ============================== screens/Adem.jsx ============================== */
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

function Adem({ settings, autoStart = false, initialProtocol, onProtocolChange, onSession }) {
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

/* ============================== screens/Meer.jsx ============================== */
/* Overzicht van oefeningen. Ademprotocollen openen Adem met dat protocol;
 * Grounding en Dagboek hebben een eigen scherm. Micro-acties en Avondreset
 * wachten op inhoud en zijn daarom bewust niet aanklikbaar. */
const TOOLS = [
  { id: 'grounding', title: 'Grounding 5-4-3-2-1', desc: 'Heroriëntatie via de zintuigen.', ready: true },
  { id: 'micro-acties', title: 'Micro-acties', desc: 'Kleine, hanteerbare taken tijdens paniek.', ready: false },
  { id: 'dagboek', title: 'Dagboek', desc: 'Stemming en triggers registreren. Blijft op dit toestel.', ready: true },
  { id: 'avondreset', title: 'Avondreset', desc: 'Voorbereiding op diepe slaap.', ready: false },
];

function Meer({ onProtocol, onOpen }) {
  return (
    <main className="meer">
      <h2 className="screen-title">Oefeningen &amp; interventies</h2>

      <h3 className="group-title">Ademen</h3>
      <div className="card-grid">
        {Object.entries(PROTOCOLS).map(([key, protocol]) => (
          <button key={key} type="button" className="card card-action" onClick={() => onProtocol(key)}>
            <strong>{protocol.short}</strong>
            <p className="card-desc">{protocol.desc}</p>
          </button>
        ))}
      </div>

      <h3 className="group-title">Tools</h3>
      <div className="card-grid">
        {TOOLS.map((tool) =>
          tool.ready ? (
            <button key={tool.id} type="button" className="card card-action" onClick={() => onOpen(tool.id)}>
              <strong>{tool.title}</strong>
              <p className="card-desc">{tool.desc}</p>
            </button>
          ) : (
            <article key={tool.id} className="card card-muted" aria-disabled="true">
              <strong>
                {tool.title} <span className="tag">Inhoud volgt</span>
              </strong>
              <p className="card-desc">{tool.desc}</p>
            </article>
          )
        )}
      </div>
    </main>
  );
}

/* ============================== screens/Grounding.jsx ============================== */
/* Stap voor stap door 5-4-3-2-1. Geen invoer: benoemen in gedachten of hardop. */
function Grounding({ onBack }) {
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

/* ============================== screens/Dagboek.jsx ============================== */
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
function Dagboek({ entries, onAdd, onRemove, onBack }) {
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

/* ============================== screens/Privacy.jsx ============================== */
/* Uitleg in gewone taal. Alleen beweringen die in deze versie ook waar zijn. */
function Privacy({ onBack }) {
  return (
    <main className="privacy">
      <button type="button" className="back" onClick={onBack}>
        ‹ Terug
      </button>
      <h2 className="screen-title">Privacy</h2>

      <section className="section-group">
        <h3>Op dit toestel</h3>
        <p className="body">
          Alles wat je in LeefNu invoert of doet, blijft op dit toestel: ademsessies, dagboek,
          instellingen en je noodcontact. Er is geen synchronisatie en geen analytics. De app werkt
          volledig offline.
        </p>
      </section>

      <section className="section-group">
        <h3>Op de server</h3>
        <p className="body">
          De server bewaart uitsluitend je contactgegevens en betalingsstatus, om toegang tot
          betaalde niveaus te controleren. Geen psychologische gegevens, geen gebruiksdata.
        </p>
      </section>

      <section className="section-group">
        <h3>In een crisis</h3>
        <p className="body">
          Het noodscherm en de ademoefening doen geen enkele netwerkaanvraag. Bellen gebeurt via de
          telefoonfunctie van je toestel.
        </p>
      </section>

      <section className="section-group">
        <h3>Backup en verwijderen</h3>
        <p className="body">
          Via Instellingen exporteer je al je gegevens als één bestand, of wis je alles op dit toestel
          in één keer. Een backup bewaar je zelf; wij hebben er geen kopie van. Het anonimiseren van
          je contact- en betaalgegevens op de server regel je bij het opzeggen; dat gebeurt in deze
          versie niet automatisch vanuit de app.
        </p>
      </section>

      {PRIVACY_URL && (
        <a className="btn secondary" href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
          Volledige privacyverklaring
        </a>
      )}
    </main>
  );
}

/* ============================== screens/Instellingen.jsx ============================== */
const CONFIRM_WINDOW_MS = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;

function backupDue(settings) {
  if (!settings.backupReminder) return false;
  if (!settings.lastExportAt) return true;
  return Date.now() - new Date(settings.lastExportAt).getTime() > BACKUP_REMINDER_DAYS * DAY_MS;
}

function Instellingen({
  data,
  settings,
  setSetting,
  onClearAll,
  onOpenPrivacy,
  saveFailed,
}) {
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

/* ============================== App.jsx ============================== */
const TABS = [
  { id: 'start', label: 'Start' },
  { id: 'adem', label: 'Adem' },
  { id: 'meer', label: 'Meer' },
  { id: 'instellingen', label: 'Instellingen' },
];

export default function App() {
  const [tab, setTab] = useState('start');
  const [subScreen, setSubScreen] = useState(null); // 'grounding' | 'dagboek' | 'privacy'
  const [showCrisis, setShowCrisis] = useState(false);
  const [ademAutoStart, setAdemAutoStart] = useState(false);
  const [ademProtocol, setAdemProtocol] = useState(null);
  const online = useOnline();
  const {
    data,
    settings,
    setSetting,
    addSession,
    addJournalEntry,
    removeJournalEntry,
    clearAll,
    saveFailed,
  } = useLocalData();

  const selectTab = useCallback((next) => {
    setAdemAutoStart(false);
    setAdemProtocol(null);
    setSubScreen(null);
    setTab(next);
  }, []);

  const closeCrisis = useCallback(() => setShowCrisis(false), []);

  const handleDirectBreathe = useCallback(() => {
    setShowCrisis(false);
    setSubScreen(null);
    setAdemProtocol(null);
    setAdemAutoStart(true);
    setTab('adem');
  }, []);

  const handleOpenSettings = useCallback(() => {
    setShowCrisis(false);
    selectTab('instellingen');
  }, [selectTab]);

  const openProtocol = useCallback((key) => {
    setSubScreen(null);
    setAdemAutoStart(false);
    setAdemProtocol(key);
    setTab('adem');
  }, []);

  const backToList = useCallback(() => setSubScreen(null), []);

  const persistProtocol = useCallback((key) => setSetting('lastProtocol', key), [setSetting]);

  const renderTab = () => {
    switch (tab) {
      case 'start':
        return <Start onAdem={() => selectTab('adem')} />;
      case 'adem':
        return (
          <Adem
            settings={settings}
            autoStart={ademAutoStart}
            initialProtocol={ademProtocol}
            onProtocolChange={persistProtocol}
            onSession={addSession}
          />
        );
      case 'meer':
        if (subScreen === 'grounding') return <Grounding onBack={backToList} />;
        if (subScreen === 'dagboek') {
          return (
            <Dagboek
              entries={data.journal}
              onAdd={addJournalEntry}
              onRemove={removeJournalEntry}
              onBack={backToList}
            />
          );
        }
        return <Meer onProtocol={openProtocol} onOpen={setSubScreen} />;
      case 'instellingen':
        if (subScreen === 'privacy') return <Privacy onBack={backToList} />;
        return (
          <Instellingen
            data={data}
            settings={settings}
            setSetting={setSetting}
            onClearAll={clearAll}
            onOpenPrivacy={() => setSubScreen('privacy')}
            saveFailed={saveFailed}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app">
      <style>{LEEFNU_CSS}</style>
      <span className={`badge ${online ? '' : 'offline'}`} role="status">
        {online ? 'Offline-klaar' : 'Offline'}
      </span>

      {!showCrisis && (
        <button
          type="button"
          className="sos"
          onClick={() => setShowCrisis(true)}
          aria-label="SOS: open noodhulp"
        >
          SOS
        </button>
      )}

      {showCrisis ? (
        <Crisis
          onClose={closeCrisis}
          onDirectBreathe={handleDirectBreathe}
          onOpenSettings={handleOpenSettings}
          emergencyContact={settings.emergencyContact}
        />
      ) : (
        <>
          {renderTab()}

          <nav className="tabs" aria-label="Hoofdnavigatie">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={tab === item.id ? 'active' : ''}
                aria-current={tab === item.id ? 'page' : undefined}
                onClick={() => selectTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}

/* ============================== index.css ============================== */
const LEEFNU_CSS = `
/* LeefNu – standalone vanilla CSS. Kleuren volgens specificatie §4.
 * Lettergroottes in rem zodat "Grote tekst" (html.large-text) overal doorwerkt. */

:root {
  --bg: #1a2a4a;
  --card: #132337;
  --text: #ffffff;
  --muted: #b0b0b0;
  --sos: #d32f2f;
  --sos-active: #b71c1c;
  --accent: #64b5f6;
  --line: #24395c;
  --line-strong: #2f4a78;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

html {
  font-size: 16px;
  background: var(--bg);
}

html.large-text {
  font-size: 19px;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  overflow-x: hidden;
  user-select: none;
  -webkit-user-select: none;
}

button,
input,
select,
textarea {
  font: inherit;
}

input,
textarea {
  user-select: text;
  -webkit-user-select: text;
}

:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 3px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.app {
  min-height: 100vh;
  min-height: 100dvh;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* --- Vaste elementen ------------------------------------------------ */

.badge {
  position: fixed;
  top: calc(20px + env(safe-area-inset-top));
  left: 16px;
  z-index: 100;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 0.8125rem;
  font-weight: 500;
}

.badge::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
}

.badge.offline::before {
  background: var(--muted);
}

.sos {
  position: fixed;
  top: calc(16px + env(safe-area-inset-top));
  right: 16px;
  z-index: 100;
  min-width: 64px;
  min-height: 48px;
  background: var(--sos);
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 12px 24px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
}

.sos:active {
  background: var(--sos-active);
}

.tabs {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: var(--card);
  border-top: 1px solid var(--line);
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 90;
}

.tabs button {
  flex: 1;
  min-height: 56px;
  padding: 16px 8px;
  background: none;
  color: var(--muted);
  border: none;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s ease;
}

.tabs button.active {
  color: var(--text);
}

/* --- Schermen ------------------------------------------------------- */

main,
.crisis {
  padding: calc(80px + env(safe-area-inset-top)) 20px calc(120px + env(safe-area-inset-bottom));
  max-width: 480px;
  margin: 0 auto;
  width: 100%;
}

.crisis {
  padding-top: calc(72px + env(safe-area-inset-top));
}

.screen-title {
  font-size: 1.5rem;
  margin-bottom: 16px;
}

.group-title {
  font-size: 0.875rem;
  color: var(--muted);
  margin: 24px 0 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.crisis-title {
  font-size: 1.75rem;
  margin-bottom: 24px;
  color: #ff5252;
}

.crisis-breathe {
  margin: 36px 0 16px;
  text-align: center;
}

.crisis-close {
  margin-top: 24px;
}

.back {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 1rem;
  font-weight: 600;
  padding: 8px 0;
  margin-bottom: 8px;
  cursor: pointer;
  min-height: 44px;
}

.hint {
  text-align: center;
  color: var(--muted);
  font-size: 0.875rem;
  margin-top: 12px;
  line-height: 1.4;
}

.hint.left {
  text-align: left;
}

.body {
  color: var(--text);
  font-size: 1rem;
  line-height: 1.55;
  margin-bottom: 12px;
}

.notice {
  background: var(--card);
  border: 1px solid var(--line-strong);
  border-left: 4px solid var(--accent);
  border-radius: 8px;
  padding: 12px 14px;
  margin: 12px 0;
  font-size: 0.9375rem;
  line-height: 1.4;
}

.notice.warn {
  border-left-color: var(--sos);
}

.tag {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--line);
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 600;
  vertical-align: middle;
}

/* --- Ademcirkel (Start) --------------------------------------------- */

.circle-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 24px auto 20px;
}

.start-circle {
  margin-top: 60px;
}

.circle-btn {
  width: 220px;
  height: 220px;
  border: 2px solid var(--text);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.375rem;
  font-weight: 600;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  box-shadow: 0 0 0 12px rgba(100, 181, 246, 0.08), 0 0 0 24px rgba(100, 181, 246, 0.04);
}

.circle-btn:active {
  background: rgba(255, 255, 255, 0.06);
}

/* --- Multi-ring animatie (Adem) ------------------------------------- */

.breath {
  position: relative;
  width: 260px;
  height: 260px;
}

.breath-svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}

.breath-track {
  stroke: var(--line-strong);
}

.breath-progress {
  stroke: var(--accent);
}

.breath-rings circle {
  stroke: var(--accent);
}

.breath-rings {
  transform-origin: 50% 50%;
  transform-box: fill-box;
  transform: scale(0.85);
  transition-property: transform;
  transition-timing-function: ease-in-out;
  transition-duration: 0.6s;
}

.breath.inhale .breath-rings,
.breath.hold .breath-rings {
  transform: scale(1);
}

.breath.exhale .breath-rings {
  transform: scale(0.72);
}

.breath-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.breath-count {
  font-size: 2.25rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.breath-phase {
  font-size: 0.875rem;
  margin-top: 4px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

@keyframes ring-progress {
  from {
    stroke-dashoffset: 703.717;
  }
  to {
    stroke-dashoffset: 0;
  }
}

/* Verminderde animatie: ringen statisch, progress-ring stapt zonder overgang. */
html.reduced-motion .breath-rings {
  transition: none;
  transform: scale(0.85);
}

html.reduced-motion .breath-progress {
  animation: none !important;
}

@media (prefers-reduced-motion: reduce) {
  .breath-rings {
    transition: none;
    transform: scale(0.85);
  }

  .breath-progress {
    animation: none !important;
    stroke-dashoffset: 703.717;
  }
}

/* --- Knoppen en velden --------------------------------------------- */

.btn {
  display: block;
  width: 100%;
  max-width: 320px;
  min-height: 56px;
  margin: 12px auto;
  padding: 16px;
  background: var(--text);
  color: var(--bg);
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  line-height: 1.4;
  cursor: pointer;
}

.btn:active {
  opacity: 0.85;
}

.btn.danger {
  background: var(--sos);
  color: #fff;
}

.btn.secondary {
  background: var(--card);
  color: var(--text);
  border: 1px solid var(--line-strong);
}

.link {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 0.875rem;
  font-weight: 600;
  padding: 10px 0;
  min-height: 44px;
  cursor: pointer;
}

.link.danger-link {
  color: #ff8a80;
}

.selector-label {
  display: block;
  max-width: 320px;
  margin: 0 auto 6px;
  color: var(--muted);
  font-size: 0.8125rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.selector,
.field {
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
  display: block;
  min-height: 48px;
  padding: 12px;
  background: var(--card);
  color: var(--text);
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  font-size: 0.9375rem;
}

.selector {
  margin-bottom: 24px;
}

.textarea {
  resize: vertical;
  line-height: 1.4;
  margin-bottom: 4px;
}

.field-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 320px;
}

.field-row .btn {
  margin: 0;
}

/* --- Kaarten (Meer, Dagboek) ---------------------------------------- */

.card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-top: 12px;
}

.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 16px;
  text-align: left;
  color: var(--text);
  font-size: 1rem;
}

.card-action {
  width: 100%;
  cursor: pointer;
  border-left: 4px solid var(--accent);
}

.card-action:active {
  background: #182b45;
}

.card-muted {
  opacity: 0.7;
}

.card-desc {
  font-size: 0.8125rem;
  color: var(--muted);
  margin-top: 4px;
  line-height: 1.4;
}

/* --- Grounding ------------------------------------------------------ */

.step-card {
  text-align: center;
  padding: 16px 0;
}

.step-progress {
  color: var(--muted);
  font-size: 0.875rem;
  margin-bottom: 8px;
}

.step-count {
  width: 140px;
  height: 140px;
  margin: 12px auto 20px;
  border: 2px solid var(--accent);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3.5rem;
  font-weight: 600;
}

.step-prompt {
  font-size: 1.375rem;
  font-weight: 600;
  line-height: 1.3;
  margin-bottom: 8px;
}

.step-card .btn {
  margin-top: 20px;
}

.step-card .btn + .btn {
  margin-top: 0;
}

/* --- Dagboek -------------------------------------------------------- */

.mood-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  margin-bottom: 16px;
}

.mood {
  min-height: 64px;
  padding: 8px 2px;
  background: var(--card);
  color: var(--text);
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
}

.mood.selected {
  border-color: var(--accent);
  background: #1b3457;
}

.mood-value {
  font-size: 1.25rem;
  font-weight: 700;
}

.mood-label {
  font-size: 0.6875rem;
  color: var(--muted);
  text-align: center;
  line-height: 1.1;
}

.entry-list {
  list-style: none;
  display: grid;
  gap: 10px;
}

.entry-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.entry-mood {
  font-weight: 600;
}

.entry-date {
  color: var(--muted);
  font-size: 0.8125rem;
}

.entry-note {
  white-space: pre-wrap;
  line-height: 1.45;
  font-size: 0.9375rem;
  user-select: text;
  -webkit-user-select: text;
}

/* --- Instellingen --------------------------------------------------- */

.section-group {
  margin-bottom: 28px;
}

.section-group h3 {
  font-size: 0.875rem;
  color: var(--muted);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-group .btn {
  margin-left: 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 10px 0;
  color: var(--text);
  font-size: 0.9375rem;
  cursor: pointer;
  line-height: 1.3;
}

.checkbox-label input {
  width: 22px;
  height: 22px;
  accent-color: var(--accent);
  flex-shrink: 0;
}
`;
