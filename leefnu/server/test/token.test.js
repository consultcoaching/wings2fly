const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { laadPrivateKey, publiekeSleutelHex, signToken, verifyToken } = require("../token");

const { privateKey } = crypto.generateKeyPairSync("ed25519");
const pub = publiekeSleutelHex(privateKey);
const over1j = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();

test("tekenen en verifiëren", () => {
  const token = signToken({ email: " Test@Example.org ", niveau: "reset", tot: over1j, pid: "tr_abc123" }, privateKey);
  assert.equal(token.split(".").length, 3);
  const p = verifyToken(token, pub);
  assert.ok(p);
  assert.equal(p.sub, "test@example.org");
  assert.equal(p.niveau, "reset");
  assert.equal(p.tot, over1j);
  assert.equal(p.pid, "tr_abc123");
  assert.equal(p.exp, Math.floor(new Date(over1j).getTime() / 1000));
});

test("gemanipuleerde payload faalt", () => {
  const token = signToken({ email: "a@b.be", niveau: "reset", tot: over1j, pid: "tr_x" }, privateKey);
  const [h, p, s] = token.split(".");
  const payload = JSON.parse(Buffer.from(p, "base64url").toString());
  payload.niveau = "care";
  const vals = `${h}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${s}`;
  assert.equal(verifyToken(vals, pub), null);
});

test("andere sleutel faalt", () => {
  const ander = crypto.generateKeyPairSync("ed25519");
  const token = signToken({ email: "a@b.be", niveau: "reset", tot: over1j, pid: "tr_x" }, ander.privateKey);
  assert.equal(verifyToken(token, pub), null);
});

test("verlopen token faalt", () => {
  const gisteren = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const token = signToken({ email: "a@b.be", niveau: "reset", tot: gisteren, pid: "tr_x" }, privateKey);
  assert.equal(verifyToken(token, pub), null);
});

test("rommel faalt zonder exception", () => {
  assert.equal(verifyToken("", pub), null);
  assert.equal(verifyToken("a.b", pub), null);
  assert.equal(verifyToken("a.b.c", pub), null);
  assert.equal(verifyToken(null, pub), null);
  assert.equal(verifyToken("x.y.z", "nietgeldig"), null);
});

test("alg none wordt geweigerd", () => {
  const h = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const p = Buffer.from(JSON.stringify({ sub: "a@b.be", niveau: "care", exp: 9999999999 })).toString("base64url");
  assert.equal(verifyToken(`${h}.${p}.`, pub), null);
});

test("laadPrivateKey: PEM en base64-DER geven dezelfde publieke sleutel", () => {
  const pem = privateKey.export({ type: "pkcs8", format: "pem" });
  const der = privateKey.export({ type: "pkcs8", format: "der" }).toString("base64");
  assert.equal(publiekeSleutelHex(laadPrivateKey(pem)), pub);
  assert.equal(publiekeSleutelHex(laadPrivateKey(der)), pub);
  assert.equal(laadPrivateKey(""), null);
  assert.equal(laadPrivateKey(undefined), null);
});
