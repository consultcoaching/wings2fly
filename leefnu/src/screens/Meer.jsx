/* Informatief overzicht. De kaarten zijn bewust geen knoppen: alleen de
 * ademprotocollen zijn in deze versie uitgewerkt (tab Adem). */
const ITEMS = [
  { title: 'Slow-paced', desc: 'Reguleert hartslagvariabiliteit (HRV).' },
  { title: 'Exhale focus', desc: 'Verlengde uitademing activeert de parasympathicus.' },
  { title: 'Grounding 5-4-3-2-1', desc: 'Heroriëntatie via de zintuigen.' },
  { title: 'Sitkari', desc: 'Afkoelende ademhaling via de tanden.' },
  { title: 'Polyvagal reset', desc: 'Vaguszenuw-de-escalatie via 4-7-8 ritme.' },
  { title: 'Micro-acties', desc: 'Kleine, hanteerbare taken tijdens paniek.' },
  { title: 'Dagboek', desc: 'Stemming en triggers registreren.' },
  { title: 'Avondreset', desc: 'Voorbereiding op diepe slaap.' },
];

export default function Meer() {
  return (
    <main className="meer">
      <h2 className="screen-title">Oefeningen &amp; interventies</h2>
      <div className="card-grid">
        {ITEMS.map((item) => (
          <article key={item.title} className="card">
            <strong>{item.title}</strong>
            <p className="card-desc">{item.desc}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
