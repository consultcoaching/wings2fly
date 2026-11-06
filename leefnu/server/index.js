// leefnu/server/index.js
// Kleine HTTP-server zonder framework, achter nginx op 127.0.0.1.
//
//   POST /api/betaling            { email }            → { checkoutUrl, paymentId }
//   POST /api/mollie/webhook      id=tr_...            → verwerkt door mollie-webhook.js
//   GET  /api/token?payment=&email=                    → { token } zodra betaald
//   GET  /api/health                                   → { ok: true }
//
// Omgeving: MOLLIE_API_KEY, LEEFNU_TOKEN_PRIVATE_KEY, LEEFNU_DB, PORT (8787),
// NODE_ENV=production. Luistert alleen op 127.0.0.1.
//
// Mollie stuurt de webhook als application/x-www-form-urlencoded (id=tr_...),
// niet als JSON. Beide worden geparset.

const http = require("node:http");
const { URL } = require("node:url");
const { maakBetaling: standaardMaakBetaling } = require("./mollie-betaling");
const { webhook, openDb } = require("./mollie-webhook");
const { laadPrivateKey, signToken } = require("./token");

const MAX_BODY = 16 * 1024;
const BETALING_LIMIET = { aantal: 5, perMs: 10 * 60 * 1000 }; // per IP
const TOKEN_LIMIET = { aantal: 30, perMs: 10 * 60 * 1000 }; // per IP

/** res-stub voor interne verwerking: antwoord wordt genegeerd. */
const stilleRes = () => ({
  status() {
    return this;
  },
  send() {
    return this;
  },
  json() {
    return this;
  }
});

function leesBody(req) {
  return new Promise((resolve, reject) => {
    const delen = [];
    let grootte = 0;
    req.on("data", (d) => {
      grootte += d.length;
      if (grootte > MAX_BODY) {
        // Rest negeren, maar wél netjes antwoorden (413) i.p.v. de socket kappen.
        req.removeAllListeners("data");
        req.resume();
        reject(Object.assign(new Error("body te groot"), { code: 413 }));
        return;
      }
      delen.push(d);
    });
    req.on("end", () => resolve(Buffer.concat(delen).toString("utf8")));
    req.on("error", reject);
  });
}

function parseBody(tekst, contentType = "") {
  if (!tekst) return {};
  if (contentType.includes("application/json")) {
    try {
      const v = JSON.parse(tekst);
      return v && typeof v === "object" ? v : {};
    } catch {
      return {};
    }
  }
  return Object.fromEntries(new URLSearchParams(tekst));
}

/** Express-achtige res, zodat mollie-webhook.js ongewijzigd blijft. */
function wrapRes(res) {
  let code = 200;
  return {
    status(c) {
      code = c;
      return this;
    },
    send(t) {
      res.writeHead(code, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
      res.end(String(t));
      return this;
    },
    json(o) {
      res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify(o));
      return this;
    }
  };
}

function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length) return xff.split(",")[0].trim();
  return req.socket.remoteAddress || "?";
}

function maakRateLimiter({ aantal, perMs }) {
  const slagen = new Map(); // ip -> [timestamps]
  return (ip, nu = Date.now()) => {
    const lijst = (slagen.get(ip) || []).filter((t) => nu - t < perMs);
    if (lijst.length >= aantal) {
      slagen.set(ip, lijst);
      return false;
    }
    lijst.push(nu);
    slagen.set(ip, lijst);
    if (slagen.size > 10000) slagen.clear(); // geheugen begrensd houden
    return true;
  };
}

const normEmail = (e) => String(e || "").trim().toLowerCase();
const geldigEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;
const geldigPaymentId = (p) => /^tr_[A-Za-z0-9]{6,32}$/.test(String(p || ""));

function createServer({ maakBetaling = standaardMaakBetaling } = {}) {
  const magBetalen = maakRateLimiter(BETALING_LIMIET);
  const magToken = maakRateLimiter(TOKEN_LIMIET);

  const zoekNiveau = (paymentId, email) => {
    const db = openDb();
    try {
      return {
        rij: db.prepare("SELECT email, niveau, tot FROM niveaus WHERE payment_id = ? AND lower(email) = ?").get(paymentId, email),
        log: db.prepare("SELECT status FROM webhook_log WHERE payment_id = ?").get(paymentId)
      };
    } finally {
      db.close();
    }
  };

  return http.createServer(async (req, resRaw) => {
    const res = wrapRes(resRaw);
    const url = new URL(req.url, "http://localhost");
    const pad = url.pathname.replace(/\/+$/, "") || "/";

    try {
      if (req.method === "GET" && pad === "/api/health") {
        return res.status(200).json({ ok: true });
      }

      if (req.method === "POST" && pad === "/api/betaling") {
        if (!magBetalen(clientIp(req))) return res.status(429).json({ fout: "te veel pogingen, probeer later" });
        const body = parseBody(await leesBody(req), req.headers["content-type"]);
        const email = normEmail(body.email);
        if (!geldigEmail(email)) return res.status(400).json({ fout: "ongeldig e-mailadres" });
        const { checkoutUrl, paymentId } = await maakBetaling({ email });
        return res.status(200).json({ checkoutUrl, paymentId });
      }

      if (req.method === "POST" && pad === "/api/mollie/webhook") {
        const body = parseBody(await leesBody(req), req.headers["content-type"]);
        return webhook({ body }, res);
      }

      if (req.method === "GET" && pad === "/api/token") {
        const paymentId = url.searchParams.get("payment") || "";
        const email = normEmail(url.searchParams.get("email"));
        if (!geldigPaymentId(paymentId) || !geldigEmail(email)) return res.status(400).json({ fout: "ongeldige aanvraag" });

        if (!magToken(clientIp(req))) return res.status(429).json({ fout: "te veel pogingen, probeer later" });

        const privateKey = laadPrivateKey();
        if (!privateKey) return res.status(500).json({ fout: "token-sleutel ontbreekt" });

        let { rij, log } = zoekNiveau(paymentId, email);

        // Nog niet (als 'paid') verwerkt, bv. omdat de gebruiker terugkomt vóór
        // Mollie de webhook stuurde: zelf bij Mollie kijken via dezelfde
        // idempotente verwerking als de webhook. Hoogstens één Mollie-call.
        if (!rij && (!log || log.status !== "paid")) {
          await webhook({ body: { id: paymentId } }, stilleRes());
          ({ rij, log } = zoekNiveau(paymentId, email));
        }

        if (!rij) {
          if (!log || log.status === "onbekend") return res.status(404).json({ fout: "geen betaling gevonden voor deze combinatie" });
          // 'paid' zonder rij = andere e-mail: niet verklappen dat de betaling bestaat.
          if (log.status === "paid") return res.status(404).json({ fout: "geen betaling gevonden voor deze combinatie" });
          return res.status(202).json({ status: "in_behandeling" });
        }
        if (new Date(rij.tot).getTime() <= Date.now()) return res.status(410).json({ fout: "niveau verlopen", tot: rij.tot });

        const token = signToken({ email, niveau: rij.niveau, tot: rij.tot, pid: paymentId }, privateKey);
        return res.status(200).json({ token, niveau: rij.niveau, tot: rij.tot });
      }

      return res.status(404).json({ fout: "onbekend pad" });
    } catch (fout) {
      if (fout && fout.code === 413) {
        if (!resRaw.headersSent) res.status(413).json({ fout: "aanvraag te groot" });
        return;
      }
      // Nooit de boodschap doorgeven: die kan de Mollie-respons bevatten.
      console.error(`[leefnu-api] ${req.method} ${pad}: ${fout && fout.message ? fout.message.slice(0, 120) : fout}`);
      if (!resRaw.headersSent) res.status(500).json({ fout: "interne fout" });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 8787);
  const server = createServer();
  server.listen(port, "127.0.0.1", () => {
    console.log(`[leefnu-api] luistert op 127.0.0.1:${port} (${process.env.NODE_ENV || "development"})`);
  });
  const stop = () => server.close(() => process.exit(0));
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

module.exports = { createServer, parseBody, maakRateLimiter };
