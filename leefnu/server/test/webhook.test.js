// Tests voor mollie-webhook.js met een nagemaakte Mollie-API op localhost.
//   cd leefnu/server && npm test
// Geen netwerk, geen echte sleutel: MOLLIE_API_KEY is een dummy.

const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { webhook, nieuweEinddatum, openDb } = require("../mollie-webhook");

/* --- Nagemaakte Mollie: per aanroep de volgende voorbereide respons. --- */
let mollie;
let antwoorden;

function paid(id, extra = {}) {
  return {
    status: 200,
    body: {
      id,
      status: "paid",
      amount: { value: "49.00", currency: "EUR" },
      metadata: { email: "test@example.org" },
      ...extra
    }
  };
}

function startMollie() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const volgende = antwoorden.shift() || { status: 404, body: { status: 404 } };
      res.writeHead(volgende.status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(volgende.body));
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

/* --- Express-achtige res, zodat de handler ongewijzigd kan blijven. --- */
function maakRes() {
  const res = { code: 0, tekst: "" };
  res.status = (c) => {
    res.code = c;
    return res;
  };
  res.send = (t) => {
    res.tekst = t;
    return res;
  };
  return res;
}

async function roep(id) {
  const res = maakRes();
  await webhook({ body: { id } }, res);
  return res;
}

function lees(sql, ...params) {
  const db = openDb();
  try {
    return db.prepare(sql).all(...params);
  } finally {
    db.close();
  }
}

let dbPad;
beforeEach(async () => {
  antwoorden = [];
  mollie = await startMollie();
  process.env.MOLLIE_API_URL = `http://127.0.0.1:${mollie.address().port}/payments`;
  process.env.MOLLIE_API_KEY = "dummy_sleutel_voor_tests";
  dbPad = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "leefnu-")), "niveaus.sqlite");
  process.env.LEEFNU_DB = dbPad;
});

afterEach(() => {
  mollie.close();
  fs.rmSync(path.dirname(dbPad), { recursive: true, force: true });
});

test("open gevolgd door paid: pas de tweede webhook zet Reset", async () => {
  antwoorden.push({ status: 200, body: { id: "tr_1", status: "open" } }, paid("tr_1"));

  const eerste = await roep("tr_1");
  assert.equal(eerste.code, 200);
  assert.equal(eerste.tekst, "niet paid");
  assert.equal(lees("SELECT * FROM niveaus").length, 0);
  assert.equal(lees("SELECT status FROM webhook_log WHERE payment_id = ?", "tr_1")[0].status, "open");

  const tweede = await roep("tr_1");
  assert.equal(tweede.code, 200);
  assert.equal(tweede.tekst, "ok");
  const rijen = lees("SELECT * FROM niveaus");
  assert.equal(rijen.length, 1);
  assert.equal(rijen[0].email, "test@example.org");
  assert.equal(rijen[0].niveau, "reset");
  assert.equal(rijen[0].payment_id, "tr_1");
  const jaar = (new Date(rijen[0].tot) - Date.now()) / (365 * 24 * 3600 * 1000);
  assert.ok(jaar > 0.99 && jaar < 1.01, `tot ligt ongeveer één jaar vooruit (${jaar})`);
});

test("storing bij Mollie gevolgd door retry: retry verwerkt alsnog", async () => {
  antwoorden.push({ status: 500, body: { status: 500 } }, paid("tr_2"));

  const eerste = await roep("tr_2");
  assert.equal(eerste.code, 502);
  assert.equal(eerste.tekst, "mollie niet bereikbaar");
  assert.equal(lees("SELECT status FROM webhook_log WHERE payment_id = ?", "tr_2")[0].status, "mollie_fout");
  assert.equal(lees("SELECT * FROM niveaus").length, 0);

  const retry = await roep("tr_2");
  assert.equal(retry.code, 200);
  assert.equal(retry.tekst, "ok");
  assert.equal(lees("SELECT * FROM niveaus").length, 1);
  assert.equal(lees("SELECT status FROM webhook_log WHERE payment_id = ?", "tr_2")[0].status, "paid");
});

test("twee gelijktijdige paid-webhooks: precies één zet het niveau", async () => {
  antwoorden.push(paid("tr_3"), paid("tr_3"));

  const [a, b] = await Promise.all([roep("tr_3"), roep("tr_3")]);
  const teksten = [a.tekst, b.tekst].sort();
  assert.deepEqual(teksten, ["al verwerkt", "ok"]);
  assert.equal(a.code, 200);
  assert.equal(b.code, 200);
  assert.equal(lees("SELECT * FROM niveaus").length, 1);
  assert.equal(lees("SELECT * FROM webhook_log").length, 1);
});

test("derde webhook na paid: no-op zonder Mollie-aanroep", async () => {
  antwoorden.push(paid("tr_4"));
  assert.equal((await roep("tr_4")).tekst, "ok");
  // Geen respons meer voorbereid: een Mollie-aanroep zou 404 geven en 502 opleveren.
  const nog = await roep("tr_4");
  assert.equal(nog.code, 200);
  assert.equal(nog.tekst, "al verwerkt");
  assert.equal(antwoorden.length, 0);
});

test("tweede betaling verlengt vanaf de bestaande einddatum", async () => {
  antwoorden.push(paid("tr_5"), paid("tr_6"));
  await roep("tr_5");
  const eersteTot = lees("SELECT tot FROM niveaus")[0].tot;
  await roep("tr_6");
  const rijen = lees("SELECT * FROM niveaus");
  assert.equal(rijen.length, 1);
  assert.equal(rijen[0].payment_id, "tr_6");
  const verschil = (new Date(rijen[0].tot) - new Date(eersteTot)) / (365 * 24 * 3600 * 1000);
  assert.ok(verschil > 0.99 && verschil < 1.01, `tweede jaar bovenop het eerste (${verschil})`);
});

test("verkeerd bedrag of valuta zet geen niveau en blijft herhaalbaar", async () => {
  antwoorden.push(
    paid("tr_7", { amount: { value: "5.00", currency: "EUR" } }),
    paid("tr_7", { amount: { value: "49.00", currency: "USD" } })
  );
  assert.equal((await roep("tr_7")).tekst, "bedrag klopt niet");
  assert.equal((await roep("tr_7")).tekst, "bedrag klopt niet");
  assert.equal(lees("SELECT * FROM niveaus").length, 0);
  assert.equal(lees("SELECT status FROM webhook_log WHERE payment_id = ?", "tr_7")[0].status, "bedrag_fout");
});

test("paid zonder e-mail in metadata: 400, geen niveau", async () => {
  antwoorden.push(paid("tr_8", { metadata: {} }));
  const res = await roep("tr_8");
  assert.equal(res.code, 400);
  assert.equal(res.tekst, "geen email");
  assert.equal(lees("SELECT * FROM niveaus").length, 0);
});

test("ongeldige body en ontbrekende sleutel", async () => {
  assert.equal((await roep(undefined)).code, 400);
  assert.equal((await roep(42)).code, 400);
  delete process.env.MOLLIE_API_KEY;
  const res = await roep("tr_9");
  assert.equal(res.code, 500);
  assert.equal(res.tekst, "geen sleutel");
});

test("nieuweEinddatum: verlopen einddatum telt niet, toekomstige wel", () => {
  const nu = "2026-11-07T10:00:00.000Z";
  assert.equal(nieuweEinddatum(null, nu), "2027-11-07T10:00:00.000Z");
  assert.equal(nieuweEinddatum("2025-01-01T00:00:00.000Z", nu), "2027-11-07T10:00:00.000Z");
  assert.equal(nieuweEinddatum("2027-05-01T00:00:00.000Z", nu), "2028-05-01T00:00:00.000Z");
  assert.equal(nieuweEinddatum("onzin", nu), "2027-11-07T10:00:00.000Z");
});
