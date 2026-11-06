# LeefNu API (Mollie, niveaus)

Klein Node-proces zonder framework, achter nginx op `127.0.0.1:8787`. Doet drie dingen:
betaling aanmaken bij Mollie, de webhook verwerken, en een Ed25519-getekend niveau-token
afgeven dat de app offline controleert.

```
POST /api/betaling          { email }        → { checkoutUrl, paymentId }     (5/10 min per IP)
POST /api/mollie/webhook    id=tr_...        → "ok" | "niet paid" | "al verwerkt" | ...
GET  /api/token?payment=tr_...&email=...     → 200 { token, niveau, tot } | 202 in behandeling
                                               | 404 niet gevonden | 410 verlopen  (30/10 min per IP)
GET  /api/health                             → { ok: true }
```

## Flow

1. App stuurt e-mail naar `/api/betaling`, bewaart `{ paymentId, email }` lokaal en gaat naar
   de Mollie-checkout.
2. Mollie stuurt de gebruiker terug naar `https://leefnu.app/?betaald=1` en roept de webhook
   aan (form-urlencoded `id=tr_...`). De webhook haalt de status zelf op en zet bij `paid`
   + €49,00 EUR het niveau Reset voor 12 maanden (verlengend bij een tweede betaling).
3. App vraagt `/api/token` met e-mail en betaal-ID. Nog niet verwerkt? Dan kijkt de server
   zelf bij Mollie via dezelfde idempotente verwerking en antwoordt 202 zolang het open is.
4. App bewaart het token lokaal en controleert het offline met `TOKEN_PUBLIC_KEY`.
   Geen of vervalst of verlopen token = Free. Het crisispad kijkt hier nooit naar.

Herstel zonder lokale data: e-mail + betaal-ID via "Toegang herstellen" in de app. Wie het
betaal-ID niet meer heeft, mailt de uitbater, die het in het Mollie-dashboard opzoekt. Er is
bewust geen endpoint op e-mail alleen (dat zou verklappen wie betalende gebruiker is).

## Lokaal testen

```
cd leefnu/server
npm test                        # 25 tests, geen netwerk, dummy-sleutel
node scripts/maak-sleutels.js   # sleutelpaar voor tokens (privé → server, publiek → app)
```

SQLite: `node:sqlite` (Node ≥ 22.5, ingebouwd) of anders `better-sqlite3` (native build;
staat als optionalDependency).

## Op de server zetten (niet uitgevoerd; stappen voor een sessie met SSH-toegang)

1. `node -v` ≥ 22.5. Lager: `npm install` in de servermap voor `better-sqlite3` (vereist
   gcc/make/python3).
2. Gebruiker en mappen, eenmalig: zie kop van `deploy/leefnu-api.service`.
3. Code: `leefnu/server/` kopiëren naar `/opt/leef-nu/server/` (eigenaar root, leesbaar voor
   `leefnu`).
4. Geheimen: `deploy/api.env.example` → `/etc/leefnu/api.env` (root:leefnu, 640) met de
   live Mollie-sleutel en de privésleutel uit `maak-sleutels.js`.
5. Publieke sleutel in `leefnu/src/lib/config.js` als `TOKEN_PUBLIC_KEY`, app opnieuw bouwen
   en uitrollen. Zonder die sleutel blijft betalen verborgen.
6. `deploy/leefnu-api.service` → `/etc/systemd/system/`, `systemctl daemon-reload`,
   `systemctl enable --now leefnu-api`, check `curl -s http://127.0.0.1:8787/api/health`.
7. `deploy/nginx-api.conf` opnemen in het bestaande server-blok van leefnu.app,
   `nginx -t`, `systemctl reload nginx`.
8. In het Mollie-dashboard: webhook-URL `https://leefnu.app/api/mollie/webhook` staat al in
   `mollie-betaling.js`; het websiteprofiel moet op "Online" staan en de live-sleutel actief.
9. Eén testbetaling met de test-sleutel (NODE_ENV tijdelijk niet `production`), daarna de
   live-sleutel.

Geen van deze stappen is vanuit de cloudsessie gedaan; ze vereisen SSH naar 178.105.122.1.
