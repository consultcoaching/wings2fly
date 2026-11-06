// leefnu/server/mollie-webhook.js
// POST /api/mollie/webhook
// Vertrouwt alleen de id. Haalt status zelf op bij Mollie.
// Alleen paid + €49,00 EUR zet Reset.
//
// Invariant: een payment_id wordt hoogstens één keer op 'paid' verwerkt.
// Niet "al gezien", want Mollie stuurt voor dezelfde id meerdere webhooks
// (open → paid bij overschrijving, pending → paid bij iDEAL/Bancontact) en
// probeert opnieuw na een fout. De overgang naar 'paid' wordt atomair geclaimd
// met één voorwaardelijke UPDATE; twee gelijktijdige aanroepen kunnen die
// niet allebei winnen.

const MOLLIE_API_DEFAULT = "https://api.mollie.com/v2/payments";
const PRIJS = { value: "49.00", currency: "EUR" };
const NIVEAU = "reset";

/* node:sqlite (ingebouwd vanaf Node 22.5) of anders better-sqlite3 (native).
 * Beide hebben dezelfde API voor wat hier nodig is. */
function sqliteDriver() {
  try {
    return require("node:sqlite").DatabaseSync;
  } catch {
    return require("better-sqlite3");
  }
}

function openDb() {
  const Database = sqliteDriver();
  const db = new Database(process.env.LEEFNU_DB || "/var/lib/leefnu/niveaus.sqlite");
  db.exec(`
    CREATE TABLE IF NOT EXISTS niveaus (
      email      TEXT PRIMARY KEY,
      niveau     TEXT NOT NULL,
      tot        TEXT NOT NULL,
      payment_id TEXT NOT NULL UNIQUE,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS webhook_log (
      payment_id  TEXT PRIMARY KEY,
      status      TEXT NOT NULL,
      received_at TEXT NOT NULL
    );
  `);
  return db;
}

/** Nieuwe einddatum: één jaar na nu, of één jaar na de bestaande einddatum
 * als die nog in de toekomst ligt. Een tweede betaling verlengt dus, in plaats
 * van maanden te laten vervallen. */
function nieuweEinddatum(bestaandeTot, nu) {
  const basis = new Date(nu);
  if (bestaandeTot) {
    const huidig = new Date(bestaandeTot);
    if (!Number.isNaN(huidig.getTime()) && huidig > basis) basis.setTime(huidig.getTime());
  }
  basis.setFullYear(basis.getFullYear() + 1);
  return basis.toISOString();
}

async function webhook(req, res) {
  const id = req.body && req.body.id;
  if (!id || typeof id !== "string") return res.status(400).send("geen id");

  const key = process.env.MOLLIE_API_KEY;
  if (!key) return res.status(500).send("geen sleutel");

  const mollieApi = process.env.MOLLIE_API_URL || MOLLIE_API_DEFAULT;
  const db = openDb();
  try {
    const nu = new Date().toISOString();

    // 1. Rij aanmaken als die er nog niet is. Blokkeer alleen als deze id al
    //    volledig op 'paid' is verwerkt.
    db.prepare(
      "INSERT OR IGNORE INTO webhook_log (payment_id, status, received_at) VALUES (?, 'pending', ?)"
    ).run(id, nu);
    const rij = db.prepare("SELECT status FROM webhook_log WHERE payment_id = ?").get(id);
    if (rij && rij.status === "paid") return res.status(200).send("al verwerkt");

    // 2. Status zelf ophalen. Bij een fout blijft de rij staan; de volgende
    //    retry van Mollie komt gewoon opnieuw langs stap 1.
    let check;
    try {
      check = await fetch(`${mollieApi}/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${key}` }
      });
    } catch {
      check = null;
    }
    if (check && check.status === 404) {
      // Mollie kent deze id niet: onderscheiden van een storing, zodat de
      // token-aanvraag "niet gevonden" kan zeggen i.p.v. "in behandeling".
      db.prepare("UPDATE webhook_log SET status = 'onbekend' WHERE payment_id = ? AND status != 'paid'").run(id);
      return res.status(404).send("onbekende betaling");
    }
    if (!check || !check.ok) {
      db.prepare("UPDATE webhook_log SET status = 'mollie_fout' WHERE payment_id = ? AND status != 'paid'").run(id);
      return res.status(502).send("mollie niet bereikbaar");
    }
    const betaling = await check.json();

    // 3. Nog niet betaald: status bijhouden, klaar. Een latere 'paid' volgt.
    if (betaling.status !== "paid") {
      db.prepare("UPDATE webhook_log SET status = ? WHERE payment_id = ? AND status != 'paid'").run(
        String(betaling.status || "onbekend"),
        id
      );
      return res.status(200).send("niet paid");
    }

    // Controles vóór de claim: een afgekeurde betaling blijft herhaalbaar
    // inspecteerbaar en zet nooit een niveau.
    const bedrag = betaling.amount && betaling.amount.value;
    const valuta = betaling.amount && betaling.amount.currency;
    if (bedrag !== PRIJS.value || valuta !== PRIJS.currency) {
      db.prepare("UPDATE webhook_log SET status = 'bedrag_fout' WHERE payment_id = ? AND status != 'paid'").run(id);
      return res.status(200).send("bedrag klopt niet");
    }
    const email = betaling.metadata && betaling.metadata.email;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      db.prepare("UPDATE webhook_log SET status = 'geen_email' WHERE payment_id = ? AND status != 'paid'").run(id);
      return res.status(400).send("geen email");
    }

    // 4. De overgang naar 'paid' atomair claimen. Alleen de aanroep die deze
    //    UPDATE wint, zet het niveau.
    const claim = db.prepare("UPDATE webhook_log SET status = 'paid' WHERE payment_id = ? AND status != 'paid'").run(id);
    if (claim.changes === 0) return res.status(200).send("al verwerkt");

    const bestaand = db.prepare("SELECT tot FROM niveaus WHERE email = ?").get(email);
    const tot = nieuweEinddatum(bestaand && bestaand.tot, nu);
    db.prepare(`
      INSERT INTO niveaus (email, niveau, tot, payment_id, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        niveau = excluded.niveau,
        tot = excluded.tot,
        payment_id = excluded.payment_id,
        updated_at = excluded.updated_at
    `).run(email, NIVEAU, tot, id, nu);

    return res.status(200).send("ok");
  } finally {
    db.close();
  }
}

module.exports = { webhook, nieuweEinddatum, openDb };
