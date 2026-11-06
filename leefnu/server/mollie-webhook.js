// leefnu/server/mollie-webhook.js
// POST /api/mollie/webhook
// Vertrouwt alleen de id. Haalt status zelf op bij Mollie.
// Idempotent via SQLite. Alleen paid + €49,00 zet Reset.

const Database = require("better-sqlite3");

const DB_PATH = process.env.LEEFNU_DB || "/var/lib/leefnu/niveaus.sqlite";
const MOLLIE_API = "https://api.mollie.com/v2/payments";

function openDb() {
  const db = new Database(DB_PATH);
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

async function webhook(req, res) {
  const id = req.body && req.body.id;
  if (!id || typeof id !== "string") return res.status(400).send("geen id");

  const key = process.env.MOLLIE_API_KEY;
  if (!key) return res.status(500).send("geen sleutel");

  const db = openDb();
  const alGezien = db.prepare("SELECT 1 FROM webhook_log WHERE payment_id = ?").get(id);
  if (alGezien) {
    db.close();
    return res.status(200).send("al verwerkt");
  }

  const check = await fetch(`${MOLLIE_API}/${id}`, {
    headers: { Authorization: `Bearer ${key}` }
  });
  if (!check.ok) {
    db.close();
    return res.status(502).send("mollie niet bereikbaar");
  }
  const betaling = await check.json();

  const nu = new Date().toISOString();
  db.prepare("INSERT INTO webhook_log (payment_id, status, received_at) VALUES (?, ?, ?)").run(
    id,
    betaling.status,
    nu
  );

  if (betaling.status !== "paid") {
    db.close();
    return res.status(200).send("niet paid");
  }

  const bedrag = betaling.amount && betaling.amount.value;
  const valuta = betaling.amount && betaling.amount.currency;
  if (bedrag !== "49.00" || valuta !== "EUR") {
    db.close();
    return res.status(200).send("bedrag klopt niet");
  }

  const email = betaling.metadata && betaling.metadata.email;
  if (!email) {
    db.close();
    return res.status(400).send("geen email");
  }

  const tot = new Date();
  tot.setFullYear(tot.getFullYear() + 1);
  db.prepare(`
    INSERT INTO niveaus (email, niveau, tot, payment_id, updated_at)
    VALUES (?, 'reset', ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      niveau = excluded.niveau,
      tot = excluded.tot,
      payment_id = excluded.payment_id,
      updated_at = excluded.updated_at
  `).run(email, tot.toISOString(), id, nu);

  db.close();
  return res.status(200).send("ok");
}

module.exports = { webhook };
