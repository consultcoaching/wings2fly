import { PROTOCOLS } from '../lib/protocols';

/* Overzicht van oefeningen. Ademprotocollen openen Adem met dat protocol;
 * Grounding en Dagboek hebben een eigen scherm. Micro-acties en Avondreset
 * wachten op inhoud en zijn daarom bewust niet aanklikbaar. */
const TOOLS = [
  { id: 'grounding', title: 'Grounding 5-4-3-2-1', desc: 'Heroriëntatie via de zintuigen.', ready: true },
  { id: 'micro-acties', title: 'Micro-acties', desc: 'Kleine, hanteerbare taken tijdens paniek.', ready: false },
  { id: 'dagboek', title: 'Dagboek', desc: 'Stemming en triggers registreren. Blijft op dit toestel.', ready: true },
  { id: 'avondreset', title: 'Avondreset', desc: 'Voorbereiding op diepe slaap.', ready: false },
];

export default function Meer({ onProtocol, onOpen }) {
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
                {tool.title} <span className="tag tag-inline">Inhoud volgt</span>
              </strong>
              <p className="card-desc">{tool.desc}</p>
            </article>
          )
        )}
      </div>
    </main>
  );
}
