import { useCallback, useState } from 'react';
import Start from './screens/Start';
import Adem from './screens/Adem';
import Meer from './screens/Meer';
import Instellingen from './screens/Instellingen';
import Crisis from './screens/Crisis';
import { useSettings } from './hooks/useSettings';
import { useStoredState } from './hooks/useStoredState';
import { KEYS, clearAll } from './lib/storage';

const TABS = [
  { id: 'start', label: 'Start' },
  { id: 'adem', label: 'Adem' },
  { id: 'meer', label: 'Meer' },
  { id: 'instellingen', label: 'Instellingen' },
];

export default function App() {
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
