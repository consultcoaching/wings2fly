// leefnu/server/token.js
// Niveau-token: JWT met EdDSA (Ed25519). De server tekent met de privésleutel
// uit de omgeving; de app verifieert offline met de publieke sleutel die in de
// bundel zit. Geen token of verlopen token = free. Het crisispad kijkt hier
// nooit naar.
//
// Payload: { sub: e-mail (kleine letters), niveau, tot: ISO-datum, pid: Mollie-
// betaal-ID, iat, exp } met exp = tot in seconden sinds epoch.

const crypto = require("node:crypto");

const HEADER = Buffer.from(JSON.stringify({ alg: "EdDSA", typ: "JWT" })).toString("base64url");
// SubjectPublicKeyInfo-prefix voor een rauwe Ed25519-sleutel van 32 bytes.
const SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

/** Privésleutel uit LEEFNU_TOKEN_PRIVATE_KEY: PEM (PKCS#8) of base64 van de
 * DER-vorm, zodat hij op één regel in een EnvironmentFile past. null = geen. */
function laadPrivateKey(bron = process.env.LEEFNU_TOKEN_PRIVATE_KEY) {
  if (!bron) return null;
  const s = String(bron).trim();
  if (s.includes("BEGIN")) return crypto.createPrivateKey(s);
  return crypto.createPrivateKey({ key: Buffer.from(s, "base64"), format: "der", type: "pkcs8" });
}

/** Rauwe publieke sleutel (32 bytes) als hex; dit gaat in de app-config. */
function publiekeSleutelHex(privateKey) {
  return crypto
    .createPublicKey(privateKey)
    .export({ type: "spki", format: "der" })
    .subarray(-32)
    .toString("hex");
}

function publicKeyVanHex(hex) {
  const raw = Buffer.from(String(hex), "hex");
  if (raw.length !== 32) throw new Error("publieke sleutel moet 32 bytes zijn");
  return crypto.createPublicKey({
    key: Buffer.concat([SPKI_PREFIX, raw]),
    format: "der",
    type: "spki"
  });
}

function signToken({ email, niveau, tot, pid }, privateKey, nu = Date.now()) {
  const exp = Math.floor(new Date(tot).getTime() / 1000);
  if (!Number.isFinite(exp)) throw new Error("ongeldige einddatum");
  const payload = {
    sub: String(email).trim().toLowerCase(),
    niveau,
    tot,
    pid,
    iat: Math.floor(nu / 1000),
    exp
  };
  const input = `${HEADER}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}`;
  const sig = crypto.sign(null, Buffer.from(input), privateKey);
  return `${input}.${sig.toString("base64url")}`;
}

/** Geeft de payload terug als handtekening en vervaldatum kloppen, anders null. */
function verifyToken(token, publiekeHex, nu = Date.now()) {
  try {
    const delen = String(token).split(".");
    if (delen.length !== 3) return null;
    const [h, p, s] = delen;
    const header = JSON.parse(Buffer.from(h, "base64url").toString());
    if (header.alg !== "EdDSA") return null;
    const ok = crypto.verify(
      null,
      Buffer.from(`${h}.${p}`),
      publicKeyVanHex(publiekeHex),
      Buffer.from(s, "base64url")
    );
    if (!ok) return null;
    const payload = JSON.parse(Buffer.from(p, "base64url").toString());
    if (!payload.exp || payload.exp * 1000 <= nu) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = { laadPrivateKey, publiekeSleutelHex, signToken, verifyToken };
