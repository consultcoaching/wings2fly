import { PRIVACY_URL } from '../lib/config';

/* Uitleg in gewone taal. Alleen beweringen die in deze versie ook waar zijn. */
export default function Privacy({ onBack }) {
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
