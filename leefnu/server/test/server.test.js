// Integratietest van index.js: echte HTTP-server op een vrije poort, nagemaakte
// Mollie voor de webhook, geïnjecteerde maakBetaling voor /api/betaling.
const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");

const { createServer, parseBody, maakRateLimiter } = require("../index");
const { publiekeSleutelHex, verifyToken } = require("../token");

const { privateKey } = crypto.generateKeyPairSync("ed25519");
const PUB = publiekeSleutelHex(privateKey);

let api;
let mollie;
let antwoorden;
let dbDir;

function luister(server) {
  return new Promise((r) => server.listen(0, "127.0.0.1", () => r(server)));
}

async function vraag(pad, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`http://127.0.0.1:${api.address().port}${pad}`, { method, body, headers });
  const tekst = await res.text();
  let json = null;
  try {
    json = JSON.parse(tekst);
  } catch {
    /* tekst */
  }
  return { status: res.status, tekst, json };
}

beforeEach(async () => {
  antwoorden = [];
  mollie = await luister(
    http.createServer((req, res) => {
      const a = antwoorden.shift() || { status: 404, body: {} };
      res.writeHead(a.status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(a.body));
    })
  );
  dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "leefnu-api-"));
  process.env.LEEFNU_DB = path.join(dbDir, "niveaus.sqlite");
  process.env.MOLLIE_API_URL = `http://127.0.0.1:${mollie.address().port}/payments`;
  process.env.MOLLIE_API_KEY = "dummy";
  process.env.LEEFNU_TOKEN_PRIVATE_KEY = privateKey.export({ type: "pkcs8", format: "der" }).toString("base64");
  api = await luister(
    createServer({
      maakBetaling: async ({ email }) => ({ checkoutUrl: `https://checkout.test/${email}`, paymentId: "tr_test0001" })
    })
  );
});

afterEach(() => {
  api.close();
  mollie.close();
  fs.rmSync(dbDir, { recursive: true, force: true });
});

const paid = (id, email = "klant@example.org") => ({
  status: 200,
  body: { id, status: "paid", amount: { value: "49.00", currency: "EUR" }, metadata: { email } }
});

test("health", async () => {
  const r = await vraag("/api/health");
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { ok: true });
});

test("betaling aanmaken: e-mail genormaliseerd, ongeldig geweigerd", async () => {
  const ok = await vraag("/api/betaling", {
    method: "POST",
    body: JSON.stringify({ email: " Klant@Example.org " }),
    headers: { "Content-Type": "application/json" }
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.paymentId, "tr_test0001");
  assert.equal(ok.json.checkoutUrl, "https://checkout.test/klant@example.org");

  const fout = await vraag("/api/betaling", {
    method: "POST",
    body: JSON.stringify({ email: "geen-adres" }),
    headers: { "Content-Type": "application/json" }
  });
  assert.equal(fout.status, 400);
});

test("webhook als form-urlencoded (zoals Mollie) en token-flow: 202 → 200 → verifieerbaar", async () => {
  // Nog geen webhook en Mollie kent de id niet (mock geeft 404): niet gevonden.
  let t = await vraag("/api/token?payment=tr_test0001&email=klant@example.org");
  assert.equal(t.status, 404);
  // Nog geen webhook, Mollie zegt 'open': in behandeling.
  antwoorden.push({ status: 200, body: { id: "tr_test0001", status: "open" } });
  t = await vraag("/api/token?payment=tr_test0001&email=klant@example.org");
  assert.equal(t.status, 202);

  // Eerste webhook: open.
  antwoorden.push({ status: 200, body: { id: "tr_test0001", status: "open" } });
  let w = await vraag("/api/mollie/webhook", {
    method: "POST",
    body: "id=tr_test0001",
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });
  assert.equal(w.status, 200);
  assert.equal(w.tekst, "niet paid");

  // Elke poll bij een nog open betaling kijkt opnieuw bij Mollie (begrensd door de rate limit).
  antwoorden.push({ status: 200, body: { id: "tr_test0001", status: "open" } });
  t = await vraag("/api/token?payment=tr_test0001&email=klant@example.org");
  assert.equal(t.status, 202);
  assert.equal(t.json.status, "in_behandeling");

  // Tweede webhook: paid.
  antwoorden.push(paid("tr_test0001"));
  w = await vraag("/api/mollie/webhook", {
    method: "POST",
    body: "id=tr_test0001",
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });
  assert.equal(w.tekst, "ok");

  t = await vraag("/api/token?payment=tr_test0001&email=Klant@Example.org");
  assert.equal(t.status, 200);
  assert.equal(t.json.niveau, "reset");
  const payload = verifyToken(t.json.token, PUB);
  assert.ok(payload, "token verifieert met de publieke sleutel");
  assert.equal(payload.sub, "klant@example.org");
  assert.equal(payload.pid, "tr_test0001");
});

test("token vóór de webhook: Mollie zegt al paid → verwerkt en 200", async () => {
  antwoorden.push(paid("tr_test0003"));
  const t = await vraag("/api/token?payment=tr_test0003&email=klant@example.org");
  assert.equal(t.status, 200);
  assert.ok(verifyToken(t.json.token, PUB));
  // De latere webhook van Mollie is dan een no-op, zonder nieuwe Mollie-call.
  const w = await vraag("/api/mollie/webhook", {
    method: "POST",
    body: "id=tr_test0003",
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });
  assert.equal(w.tekst, "al verwerkt");
  assert.equal(antwoorden.length, 0);
});

test("token: verkeerde e-mail bij juiste betaling is 404 (geen orakel)", async () => {
  antwoorden.push(paid("tr_test0002"));
  await vraag("/api/mollie/webhook", {
    method: "POST",
    body: JSON.stringify({ id: "tr_test0002" }),
    headers: { "Content-Type": "application/json" }
  });
  const fout = await vraag("/api/token?payment=tr_test0002&email=ander@example.org");
  assert.equal(fout.status, 404);
  const goed = await vraag("/api/token?payment=tr_test0002&email=klant@example.org");
  assert.equal(goed.status, 200);
});

test("token: ongeldige parameters en ontbrekende sleutel", async () => {
  assert.equal((await vraag("/api/token?payment=hack&email=a@b.be")).status, 400);
  assert.equal((await vraag("/api/token?payment=tr_abcdef&email=x")).status, 400);
  delete process.env.LEEFNU_TOKEN_PRIVATE_KEY;
  assert.equal((await vraag("/api/token?payment=tr_abcdef&email=a@b.be")).status, 500);
});

test("onbekend pad en te grote body", async () => {
  assert.equal((await vraag("/api/niets")).status, 404);
  const groot = await vraag("/api/betaling", {
    method: "POST",
    body: "x".repeat(20000),
    headers: { "Content-Type": "application/json" }
  });
  assert.equal(groot.status, 413);
});

test("parseBody en rate limiter", () => {
  assert.deepEqual(parseBody("id=tr_1", "application/x-www-form-urlencoded"), { id: "tr_1" });
  assert.deepEqual(parseBody('{"id":"tr_1"}', "application/json"), { id: "tr_1" });
  assert.deepEqual(parseBody("{kapot", "application/json"), {});
  assert.deepEqual(parseBody("", "application/json"), {});
  const limiet = maakRateLimiter({ aantal: 2, perMs: 1000 });
  assert.equal(limiet("1.1.1.1", 0), true);
  assert.equal(limiet("1.1.1.1", 10), true);
  assert.equal(limiet("1.1.1.1", 20), false);
  assert.equal(limiet("2.2.2.2", 20), true);
  assert.equal(limiet("1.1.1.1", 1100), true);
});
