import { useCallback, useState } from 'react';
import Start from './screens/Start';
import Adem from './screens/Adem';
import Meer from './screens/Meer';
import Grounding from './screens/Grounding';
import Dagboek from './screens/Dagboek';
import Instellingen from './screens/Instellingen';
import Privacy from './screens/Privacy';
import Crisis from './screens/Crisis';
import { useLocalData } from './hooks/useLocalData';
import { useOnline } from './hooks/useOnline';

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
