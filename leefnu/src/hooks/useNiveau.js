import { useCallback, useEffect, useState } from 'react';
import { verifieerToken } from '../lib/token';
import { haalToken } from '../lib/api';
import { setCurrentTier } from '../lib/tiers';

/* Bepaalt het actieve niveau uit het lokaal bewaarde token (offline) en
 * handelt de terugkeer van Mollie af (?betaald=1 + openstaande betaling).
 * Alles hier is buiten het crisispad: fouten leiden hoogstens tot 'free'. */
export function useNiveau(settings, setSetting) {
  const [niveau, setNiveau] = useState('free');
  const [tot, setTot] = useState(null);
  const [terugkeer, setTerugkeer] = useState(null); // null | 'wacht' | 'ok' | { fout }

  // 1. Token verifiëren bij laden en bij wijziging.
  useEffect(() => {
    let actief = true;
    (async () => {
      const info = settings.niveauToken ? await verifieerToken(settings.niveauToken) : null;
      if (!actief) return;
      const key = setCurrentTier(info ? info.niveau : 'free');
      setNiveau(key);
      setTot(info ? info.tot : null);
    })();
    return () => {
      actief = false;
    };
  }, [settings.niveauToken]);

  // 2. Token ophalen voor een openstaande betaling (na redirect of via herstelknop).
  const haalOp = useCallback(
    async (paymentId, email) => {
      setTerugkeer('wacht');
      const r = await haalToken(paymentId, email);
      if (r.status === 'ok') {
        const info = await verifieerToken(r.token);
        if (!info) {
          setTerugkeer({ fout: 'Het ontvangen token is ongeldig. Neem contact op.' });
          return;
        }
        setSetting('niveauToken', r.token);
        setSetting('pendingPayment', null);
        setTerugkeer('ok');
        return;
      }
      if (r.status === 'wacht') {
        setTerugkeer('wacht');
        return;
      }
      setTerugkeer({ fout: r.bericht });
    },
    [setSetting]
  );

  // 3. Terug van Mollie: URL opschonen en meteen proberen.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has('betaald')) return;
    url.searchParams.delete('betaald');
    window.history.replaceState(null, '', url.pathname + (url.search || '') + url.hash);
    const p = settings.pendingPayment;
    if (p && p.paymentId && p.email) haalOp(p.paymentId, p.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { niveau, tot, terugkeer, haalOp, wisTerugkeer: () => setTerugkeer(null) };
}
