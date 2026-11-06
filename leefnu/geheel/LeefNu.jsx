/* LeefNu – "Geheel": de volledige app in één bestand.
 *
 * AFGELEID van ../src (lib, hooks, screens, App, index.css). Bron van waarheid
 * is ../src; wijzig daar en werk dit bestand daarna bij. Bedoeld voor een
 * canvas/preview zonder bundler (default export = App). Bevat geen service
 * worker: die vereist een apart bestand (zie ../public/sw.js).
 *
 * Gebruik: import LeefNu from './LeefNu.jsx'; <LeefNu />
 */
import { useCallback, useEffect, useRef, useState } from 'react';

/* ============================== lib/storage ============================== */

const PREFIX = 'leefnu.';
const KEYS = { settings: `${PREFIX}settings`, contact: `${PREFIX}noodcontact` };

function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readJSON(key, fallback) {
  const store = safeStorage();
  if (!store) return fallback;
  try {
    const raw = store.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  const store = safeStorage();
  if (!store) return false;
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function removeKey(key) {
  const store = safeStorage();
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    /* niets te verwijderen */
  }
}

function exportAll() {
  const store = safeStorage();
  const data = {};
  if (!store) return data;
  for (let i = 0; i < store.length; i += 1) {
    const key = store.key(i);
    if (key && key.startsWith(PREFIX)) data[key] = readJSON(key, null);
  }
  return data;
}

function clearAll() {
  const store = safeStorage();
  if (!store) return;
  const toRemove = [];
  for (let i = 0; i < store.length; i += 1) {
    const key = store.key(i);
    if (key && key.startsWith(PREFIX)) toRemove.push(key);
  }
  toRemove.forEach((key) => store.removeItem(key));
}

function toTelHref(phone) {
  const clean = String(phone || '').replace(/[^\d+]/g, '');
  if (clean.length < 3) return null;
  return `tel:${clean}`;
}

/* ============================= lib/protocols ============================= */

const PROTOCOLS = {
  'slow-paced': { name: 'Slow-paced (4-2-6)', inhale: 4, hold: 2, exhale: 6 },
  exhale: { name: 'Exhale focus (4-0-8)', inhale: 4, hold: 0, exhale: 8 },
  sitkari: { name: 'Sitkari (5-5-5)', inhale: 5, hold: 5, exhale: 5 },
  polyvagal: { name: 'Polyvagal reset (4-7-8)', inhale: 4, hold: 7, exhale: 8 },
};
const DEFAULT_PROTOCOL = 'slow-paced';
const PHASE_ORDER = ['inhale', 'hold', 'exhale'];
const PHASES = {
  inhale: { label: 'Adem in', voice: 'Adem in', vibrate: [60] },
  hold: { label: 'Houd vast', voice: 'Houd vast', vibrate: [30, 60, 30] },
  exhale: { label: 'Adem uit', voice: 'Adem uit', vibrate: [120] },
};
const phaseSequence = (protocol) => PHASE_ORDER.filter((phase) => protocol[phase] > 0);

/* ================================= hooks ================================= */

function useStoredState(key, fallback) {
  const [value, setValue] = useState(() => {
    const stored = readJSON(key, fallback);
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      return { ...fallback, ...stored };
    }
    return stored;
  });
  const update = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        writeJSON(key, resolved);
        return resolved;
      });
    },
    [key]
  );
  const reset = useCallback(() => {
    removeKey(key);
    setValue(fallback);
  }, [key, fallback]);
  return [value, update, reset];
}

const DEFAULT_SETTINGS = { largeText: false, reducedMotion: false, haptics: true, voice: false };

function useSettings() {
  const [settings, setSettings, resetSettings] = useStoredState(KEYS.settings, DEFAULT_SETTINGS);
  const setSetting = useCallback(
    (name, value) => setSettings((prev) => ({ ...prev, [name]: value })),
    [setSettings]
  );
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('large-text', Boolean(settings.largeText));
    root.classList.toggle('reduced-motion', Boolean(settings.reducedMotion));
  }, [settings.largeText, settings.reducedMotion]);
  return { settings, setSetting, resetSettings };
}

function useBreathing({ protocol, running, onPhase }) {
  const initialPhase = phaseSequence(protocol)[0];
  const [state, setState] = useState({ phase: initialPhase, secondsLeft: protocol[initialPhase] });
  const onPhaseRef = useRef(onPhase);
  useEffect(() => {
    onPhaseRef.current = onPhase;
  }, [onPhase]);

  useEffect(() => {
    const sequence = phaseSequence(protocol);
    if (sequence.length === 0) return undefined;
    if (!running) {
      setState({ phase: sequence[0], secondsLeft: protocol[sequence[0]] });
      return undefined;
    }
    let index = 0;
    let secondsLeft = protocol[sequence[0]];
    setState({ phase: sequence[0], secondsLeft });
    onPhaseRef.current?.(sequence[0]);
    const timer = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        index = (index + 1) % sequence.length;
        secondsLeft = protocol[sequence[index]];
        onPhaseRef.current?.(sequence[index]);
      }
      setState({ phase: sequence[index], secondsLeft });
    }, 1000);
    return () => clearInterval(timer);
  }, [running, protocol]);

  return state;
}

/* ================================ screens ================================ */

function Crisis({ onClose, onDirectBreathe, onOpenSettings, emergencyContact }) {
  const contactHref = toTelHref(emergencyContact);
  const firstActionRef = useRef(null);

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

function Start({ onAdem }) {
  return (
    <main className="start">
      <span className="badge">Standalone modus</span>
      <div className="circle-container start-circle">
        <button
          type="button"
          className="circle-btn"
          onClick={onAdem}
          aria-label="Direct starten met ademhaling"
        >
          Adem nu
        </button>
      </div>
      <p className="hint">Eén tik om het zenuwstelsel te kalmeren.</p>
    </main>
  );
}

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
    /* optioneel */
  }
}

function stopFeedback() {
  if (canVibrate()) navigator.vibrate(0);
  if (canSpeak()) window.speechSynthesis.cancel();
}

function Adem({ settings, autoStart = false }) {
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

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') setRunning(false);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

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

const MEER_ITEMS = [
  { title: 'Slow-paced', desc: 'Reguleert hartslagvariabiliteit (HRV).' },
  { title: 'Exhale focus', desc: 'Verlengde uitademing activeert de parasympathicus.' },
  { title: 'Grounding 5-4-3-2-1', desc: 'Heroriëntatie via de zintuigen.' },
  { title: 'Sitkari', desc: 'Afkoelende ademhaling via de tanden.' },
  { title: 'Polyvagal reset', desc: 'Vaguszenuw-de-escalatie via 4-7-8 ritme.' },
  { title: 'Micro-acties', desc: 'Kleine, hanteerbare taken tijdens paniek.' },
  { title: 'Dagboek', desc: 'Stemming en triggers registreren.' },
  { title: 'Avondreset', desc: 'Voorbereiding op diepe slaap.' },
];

function Meer() {
  return (
    <main className="meer">
      <h2 className="screen-title">Oefeningen &amp; interventies</h2>
      <div className="card-grid">
        {MEER_ITEMS.map((item) => (
          <article key={item.title} className="card">
            <strong>{item.title}</strong>
            <p className="card-desc">{item.desc}</p>
          </article>
        ))}
      </div>
    </main>
  );
}

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

function Instellingen({ settings, setSetting, emergencyContact, setEmergencyContact, onClearAll }) {
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
      setConfirmClear(true);
      confirmTimer.current = setTimeout(() => setConfirmClear(false), CONFIRM_WINDOW_MS);
      return;
    }
    clearTimeout(confirmTimer.current);
    setConfirmClear(false);
    onClearAll();
  };

  const voiceSupported = canSpeak();
  const hapticsSupported = canVibrate();

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

/* ================================== App ================================== */

const TABS = [
  { id: 'start', label: 'Start' },
  { id: 'adem', label: 'Adem' },
  { id: 'meer', label: 'Meer' },
  { id: 'instellingen', label: 'Instellingen' },
];

export default function LeefNu() {
  const [tab, setTab] = useState('start');
  const [showCrisis, setShowCrisis] = useState(false);
  const [ademAutoStart, setAdemAutoStart] = useState(false);
  const { settings, setSetting, resetSettings } = useSettings();
  const [emergencyContact, setEmergencyContact, resetEmergencyContact] = useStoredState(
    KEYS.contact,
    ''
  );

  const selectTab = useCallback((next) => {
    setAdemAutoStart(false);
    setTab(next);
  }, []);

  const closeCrisis = useCallback(() => setShowCrisis(false), []);

  const handleDirectBreathe = useCallback(() => {
    setShowCrisis(false);
    setAdemAutoStart(true);
    setTab('adem');
  }, []);

  const handleOpenSettings = useCallback(() => {
    setShowCrisis(false);
    selectTab('instellingen');
  }, [selectTab]);

  const handleClearAll = useCallback(() => {
    clearAll();
    resetSettings();
    resetEmergencyContact();
  }, [resetSettings, resetEmergencyContact]);

  return (
    <div className="app">
      <style>{CSS}</style>
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
          emergencyContact={emergencyContact}
        />
      ) : (
        <>
          {tab === 'start' && <Start onAdem={() => selectTab('adem')} />}
          {tab === 'adem' && <Adem settings={settings} autoStart={ademAutoStart} />}
          {tab === 'meer' && <Meer />}
          {tab === 'instellingen' && (
            <Instellingen
              settings={settings}
              setSetting={setSetting}
              emergencyContact={emergencyContact}
              setEmergencyContact={setEmergencyContact}
              onClearAll={handleClearAll}
            />
          )}

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

/* ================================== CSS ================================== */

const CSS = `
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html{font-size:16px}
html.large-text{font-size:19px}
body{background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;overflow-x:hidden;user-select:none;-webkit-user-select:none}
button,input,select{font:inherit}
:focus-visible{outline:3px solid #64b5f6;outline-offset:3px}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.app{min-height:100vh;min-height:100dvh;position:relative;display:flex;flex-direction:column}
.sos{position:fixed;top:calc(16px + env(safe-area-inset-top));right:16px;z-index:100;min-width:64px;min-height:48px;background:#d32f2f;color:#fff;border:none;border-radius:999px;padding:12px 24px;font-weight:700;font-size:1rem;cursor:pointer}
.sos:active{background:#b71c1c}
.tabs{position:fixed;bottom:0;left:0;right:0;display:flex;background:#111;border-top:1px solid #222;padding-bottom:env(safe-area-inset-bottom);z-index:90}
.tabs button{flex:1;min-height:56px;padding:16px 8px;background:none;color:#888;border:none;font-size:.875rem;font-weight:600;cursor:pointer;transition:color .15s ease}
.tabs button.active{color:#fff}
.crisis,.adem,.start,.meer,.instellingen{padding:calc(80px + env(safe-area-inset-top)) 20px calc(120px + env(safe-area-inset-bottom));max-width:480px;margin:0 auto;width:100%}
.crisis{padding-top:calc(32px + env(safe-area-inset-top))}
.screen-title{font-size:1.5rem;margin-bottom:16px}
.crisis-title{font-size:1.75rem;margin-bottom:24px;color:#ff5252}
.crisis-breathe{margin:36px 0 16px;text-align:center}
.crisis-close{margin-top:24px}
.badge{position:absolute;top:calc(16px + env(safe-area-inset-top));left:16px;color:#666;font-size:.8125rem;font-weight:500}
.hint{text-align:center;color:#999;font-size:.875rem;margin-top:12px}
.circle-container{display:flex;flex-direction:column;align-items:center;justify-content:center;margin:40px auto 20px}
.start-circle{margin-top:60px}
.circle,.circle-btn{width:220px;height:220px;border:2px solid #fff;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:1.375rem;font-weight:600;background:transparent;color:#fff;cursor:pointer;transition:transform .4s ease,border-color .4s ease}
.circle{cursor:default}
.circle-count{font-size:2rem;font-variant-numeric:tabular-nums}
.circle.inhale{transform:scale(1.25);border-color:#64b5f6}
.circle.hold{transform:scale(1.25);border-color:#81c784}
.circle.exhale{transform:scale(.9);border-color:#ffb74d}
.phase-text{font-size:.875rem;margin-top:6px;color:#ddd;text-transform:uppercase;letter-spacing:1px}
html.reduced-motion .circle,html.reduced-motion .circle-btn{transition:border-color .4s ease}
html.reduced-motion .circle.inhale,html.reduced-motion .circle.hold,html.reduced-motion .circle.exhale{transform:none}
@media (prefers-reduced-motion:reduce){.circle,.circle-btn{transition:border-color .4s ease}.circle.inhale,.circle.hold,.circle.exhale{transform:none}}
.btn{display:block;width:100%;max-width:320px;min-height:56px;margin:12px auto;padding:16px;background:#fff;color:#000;border:none;border-radius:8px;font-size:1rem;font-weight:600;text-align:center;text-decoration:none;line-height:1.4;cursor:pointer}
.btn:active{opacity:.85}
.btn.danger{background:#d32f2f;color:#fff}
.btn.secondary{background:#222;color:#fff;border:1px solid #333}
.selector-label{display:block;max-width:320px;margin:0 auto 6px;color:#888;font-size:.8125rem;text-transform:uppercase;letter-spacing:.5px}
.selector,.field{width:100%;max-width:320px;margin:0 auto;display:block;min-height:48px;padding:12px;background:#1a1a1a;color:#fff;border:1px solid #333;border-radius:8px;font-size:.9375rem}
.selector{margin-bottom:24px}
.field-row{display:flex;flex-direction:column;gap:8px;max-width:320px;margin:0 auto}
.field-row .btn{margin:0}
.card-grid{display:grid;grid-template-columns:1fr;gap:12px;margin-top:20px}
.card{background:#141414;border:1px solid #222;border-radius:8px;padding:16px;text-align:left;color:#fff;font-size:1rem}
.card-desc{font-size:.8125rem;color:#999;margin-top:4px}
.section-group{margin-bottom:28px}
.section-group h3{font-size:.875rem;color:#888;margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px}
.section-group .btn{margin-left:0}
.section-group .hint{text-align:left}
.checkbox-label{display:flex;align-items:center;gap:12px;min-height:48px;padding:10px 0;color:#ddd;font-size:.9375rem;cursor:pointer}
.checkbox-label input{width:22px;height:22px;accent-color:#64b5f6;flex-shrink:0}
`;
