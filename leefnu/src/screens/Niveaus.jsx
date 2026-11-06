import { useState } from 'react';
import { flushSync } from 'react-dom';
import { FEATURE_LABELS, TIERS, TIER_ORDER } from '../lib/tiers';
import { tokenIngeschakeld } from '../lib/token';
import { startBetaling } from '../lib/api';

const BETAALD_NIVEAU = 'reset';
const geldigEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const geldigPaymentId = (p) => /^tr_[A-Za-z0-9]{6,32}$/.test(p);

const formatDatum = (iso) => {
  try {
    return new Intl.DateTimeFormat('nl-BE', { dateStyle: 'long' }).format(new Date(iso));
  } catch {
    return iso;
  }
};

/* Overzicht Free / Reset / Care. Met TOKEN_PUBLIC_KEY in config: Reset is te
 * kopen (e-mail → Mollie-checkout → terug met ?betaald=1 → token) en er is een
 * herstelknop voor wie de redirect miste. Zonder sleutel: alleen weergave. */
export default function Niveaus({ onBack, niveau, tot, terugkeer, haalOp, wisTerugkeer, settings, setSetting }) {
  const actief = tokenIngeschakeld();
  const [toonKoop, setToonKoop] = useState(false);
  const [email, setEmail] = useState(settings.pendingPayment?.email || '');
  const [akkoord, setAkkoord] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState('');
  const [toonHerstel, setToonHerstel] = useState(false);
  const [herstelEmail, setHerstelEmail] = useState('');
  const [herstelId, setHerstelId] = useState('');
  const [herstelFout, setHerstelFout] = useState('');

  const betalen = async (event) => {
    event.preventDefault();
    const e = email.trim().toLowerCase();
    if (!geldigEmail(e)) return setFout('Controleer je e-mailadres.');
    if (!akkoord) return setFout('Vink eerst aan dat je akkoord gaat.');
    setFout('');
    setBezig(true);
    try {
      const { checkoutUrl, paymentId } = await startBetaling(e);
      // Synchroon wegschrijven vóór we de pagina verlaten, anders is de
      // openstaande betaling weg wanneer Mollie ons terugstuurt.
      flushSync(() => setSetting('pendingPayment', { paymentId, email: e, at: new Date().toISOString() }));
      window.location.assign(checkoutUrl);
    } catch (err) {
      setFout(err.message || 'Er ging iets mis.');
      setBezig(false);
    }
  };

  const herstellen = async (event) => {
    event.preventDefault();
    const e = herstelEmail.trim().toLowerCase();
    const p = herstelId.trim();
    if (!geldigEmail(e)) return setHerstelFout('Controleer je e-mailadres.');
    if (!geldigPaymentId(p)) return setHerstelFout('Een betaal-ID ziet eruit als tr_ gevolgd by letters en cijfers.');
    setHerstelFout('');
    await haalOp(p, e);
  };

  const opnieuw = () => {
    const p = settings.pendingPayment;
    if (p && p.paymentId && p.email) haalOp(p.paymentId, p.email);
  };

  return (
    <main className="niveaus">
      <button type="button" className="back" onClick={onBack}>
        ‹ Terug
      </button>
      <h2 className="screen-title">Niveaus</h2>
      <p className="hint left">
        Noodhulp, ademhaling en grounding zijn altijd gratis.
        {!actief && ' Betaalde niveaus komen later.'}
      </p>

      {terugkeer === 'wacht' && (
        <div className="notice" role="status">
          Je betaling wordt verwerkt. Bij een overschrijving kan dat enkele dagen duren.
          <button type="button" className="link" onClick={opnieuw}>
            Opnieuw controleren
          </button>
        </div>
      )}
      {terugkeer === 'ok' && (
        <div className="notice" role="status">
          Gelukt: {TIERS[niveau]?.naam || 'je niveau'} is actief{tot ? ` tot ${formatDatum(tot)}` : ''}.
          <button type="button" className="link" onClick={wisTerugkeer}>
            Sluiten
          </button>
        </div>
      )}
      {terugkeer && terugkeer.fout && (
        <div className="notice warn" role="alert">
          {terugkeer.fout}
          <button type="button" className="link" onClick={wisTerugkeer}>
            Sluiten
          </button>
        </div>
      )}

      <div className="card-grid">
        {TIER_ORDER.map((id) => {
          const tier = TIERS[id];
          const isCurrent = id === niveau;
          const koopbaar = actief && id === BETAALD_NIVEAU && !isCurrent;
          return (
            <article
              key={id}
              className={`card tier ${isCurrent ? 'tier-current' : ''}`}
              style={{ borderLeftColor: tier.kleur }}
              aria-current={isCurrent ? 'true' : undefined}
            >
              <div className="tier-head">
                <strong className="tier-name">{tier.naam}</strong>
                {tier.prijs && <span className="tier-price">{tier.prijs}</span>}
              </div>
              <ul className="tier-features">
                {FEATURE_LABELS[id].map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
              {isCurrent ? (
                <span className="tag tag-current">
                  Huidig niveau{id !== 'free' && tot ? ` · tot ${formatDatum(tot)}` : ''}
                </span>
              ) : koopbaar ? (
                <button type="button" className="btn" onClick={() => setToonKoop((v) => !v)} aria-expanded={toonKoop}>
                  {tier.naam} nemen · {tier.prijs}
                </button>
              ) : (
                <span className="tag">Binnenkort</span>
              )}

              {koopbaar && toonKoop && (
                <form onSubmit={betalen} className="field-row koop">
                  <label htmlFor="koop-email" className="selector-label">
                    Je e-mailadres (voor je toegang en de bevestiging)
                  </label>
                  <input
                    id="koop-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    className="field"
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                    required
                  />
                  <label className="checkbox-label">
                    <input type="checkbox" checked={akkoord} onChange={(ev) => setAkkoord(ev.target.checked)} />
                    Ik ga akkoord met de algemene voorwaarden en heb het herroepingsbeleid gelezen.
                  </label>
                  <button type="submit" className="btn" disabled={bezig}>
                    {bezig ? 'Even geduld…' : 'Betalen via Mollie'}
                  </button>
                  {fout && (
                    <p className="hint left" role="alert">
                      {fout}
                    </p>
                  )}
                  <p className="hint left">
                    Je gaat naar de beveiligde betaalpagina van Mollie en komt daarna terug in de app.
                  </p>
                </form>
              )}
            </article>
          );
        })}
      </div>

      {actief && (
        <section className="section-group herstel">
          <h3>Al betaald, maar geen toegang?</h3>
          <p className="hint left">
            Bijvoorbeeld na het wissen van je browsergegevens of op een ander toestel. Vul je
            e-mailadres en het betaal-ID in. Vind je het ID niet terug, mail ons dan.
          </p>
          {!toonHerstel ? (
            <button type="button" className="btn secondary" onClick={() => setToonHerstel(true)}>
              Toegang herstellen
            </button>
          ) : (
            <form onSubmit={herstellen} className="field-row">
              <label htmlFor="herstel-email" className="sr-only">
                E-mailadres
              </label>
              <input
                id="herstel-email"
                type="email"
                className="field"
                placeholder="E-mailadres"
                value={herstelEmail}
                onChange={(ev) => setHerstelEmail(ev.target.value)}
              />
              <label htmlFor="herstel-id" className="sr-only">
                Betaal-ID
              </label>
              <input
                id="herstel-id"
                type="text"
                className="field"
                placeholder="Betaal-ID (tr_…)"
                autoCapitalize="none"
                value={herstelId}
                onChange={(ev) => setHerstelId(ev.target.value)}
              />
              <button type="submit" className="btn secondary">
                Ophalen
              </button>
              {herstelFout && (
                <p className="hint left" role="alert">
                  {herstelFout}
                </p>
              )}
            </form>
          )}
        </section>
      )}
    </main>
  );
}
