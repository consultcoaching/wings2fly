# LeefNu

Offline-first crisis- en ademhalingsapp (React 18, Vite 5, vanilla CSS, Vlaams).
Werkt volledig client-side; de app doet geen netwerkverkeer buiten het laden van zichzelf.
Gebouwd volgens de specificatie van 2026-11-06.

## Structuur

```
leefnu/
├── index.html                   app-shell, noscript-fallback met 112/1813
├── public/
│   ├── manifest.webmanifest     PWA-manifest (standalone, portrait, #1A2A4A)
│   ├── sw.js                    service worker: network-first, cache als fallback
│   └── icon.svg                 tijdelijk logo, zie "Open punten"
├── src/
│   ├── main.jsx                 mount + SW-registratie (alleen in productie)
│   ├── App.jsx                  tabs, SOS, offline-badge, subschermen, state-koppeling
│   ├── index.css                kleuren (spec §4) als CSS-variabelen
│   ├── lib/
│   │   ├── config.js            PRIVACY_URL, limieten, backup-interval
│   │   ├── storage.js           localStorage-sleutel leefnu-local (§7)
│   │   ├── protocols.js         ademprotocollen (seconden) en fase-labels
│   │   ├── grounding.js         stappen 5-4-3-2-1
│   │   ├── tiers.js             Free/Reset/Care + features (uit live bundle)
│   │   ├── crisisLines.js       hulplijnen (uit live bundle)
│   │   └── device.js            capability-checks (trilling, spraak)
│   ├── hooks/
│   │   ├── useLocalData.js      één bron voor sessions/journal/settings
│   │   ├── useBreathing.js      ademmotor (interval + cleanup)
│   │   └── useOnline.js         online/offline-status
│   ├── components/BreathRings.jsx   3 ringen + progress-ring + teller
│   └── screens/                 Start, Adem, Meer, Grounding, Dagboek,
│                                Instellingen, Privacy, Niveaus, Crisis
├── scripts/build-geheel.mjs     genereert geheel/LeefNu.jsx uit src/
├── geheel/LeefNu.jsx            GEGENEREERD, niet met de hand bewerken
└── server/                      Node-modules voor Mollie (nog geen draaiend proces)
    ├── mollie-betaling.js       eenmalige betaling €49,00 voor Reset
    ├── mollie-webhook.js        status ophalen, idempotent op 'paid', zet niveau
    ├── niveaus.sql              SQLite-schema (niveaus, webhook_log)
    ├── piper-stub.js            niet actief
    └── test/webhook.test.js     9 tests met nagemaakte Mollie-API: npm test
```

## Server (Mollie) en niveau-token

Zie `server/README.md` voor de API, de flow en de uitrolstappen. Kort:

- `server/index.js`: HTTP-server (betaling, webhook, token, health), `deploy/` bevat de
  systemd-unit, een env-voorbeeld en de nginx-locatie. Niets daarvan is uitgerold.
- Token: JWT met EdDSA (Ed25519). Server tekent met `LEEFNU_TOKEN_PRIVATE_KEY`; de app
  controleert offline met `TOKEN_PUBLIC_KEY` in `src/lib/config.js` (via `@noble/ed25519`).
  Zonder publieke sleutel blijft iedereen Free en is betalen verborgen.
- `currentTier()` in `src/lib/tiers.js` volgt het geverifieerde token (`useNiveau`).
  Het crisispad kijkt er nooit naar.
- Webhook-invariant: een `payment_id` wordt hoogstens één keer op `paid` verwerkt, geclaimd
  met één voorwaardelijke `UPDATE`. Een tweede betaling verlengt vanaf de bestaande einddatum.

```
cd leefnu/server && npm test     # 25 tests, geen netwerk
```

Geverifieerd in de browser (Playwright, echte API met nagemaakte Mollie, 18 controles):
kopen → terug met `?betaald=1` → 202 zolang open → webhook `paid` → token → Reset actief,
offline na herladen, dagboeklimiet weg, vervalst token valt terug op Free, herstel met
e-mail + betaal-ID, verkeerde e-mail geeft niets prijs.

## Ontwikkelen en bouwen

```
npm install
npm run dev       # http://localhost:5173
npm run build     # output in dist/
npm run preview   # productie-build lokaal bekijken
npm run geheel    # geheel/LeefNu.jsx opnieuw genereren na wijzigingen in src/
```

Draait de app onder een subpad (bv. `/leefnu/`), zet dan `base` in `vite.config.js`
en `start_url`/`scope` in `public/manifest.webmanifest`.

## Mapping op de specificatie

| Spec | Status |
|---|---|
| §3 SOS vast rechtsboven, 4 tabs, offline-badge linksboven | gedaan; badge toont "Offline-klaar" of "Offline" via `navigator.onLine` |
| §4 kleuren | gedaan, als CSS-variabelen in `index.css` |
| §5 Start | gedaan |
| §5 Adem: selector, 3 ringen, progress-ring, teller + fase, reduced motion, cleanup | gedaan; animatieduur = faseduur; stopt bij tabwissel en scherm op slot |
| §5 Noodhulp | gedaan; 1813 en 112 als grote knoppen, 113 / 0800 0113 / FR-lijn / Tele-Onthaal 106 als "andere lijnen"; 1813 krijgt focus, Escape sluit, noodcontact uit lokale instellingen |
| §5 Meer: 8 kaarten | gedaan; protocollen openen Adem, Grounding en Dagboek hebben een scherm, Micro-acties en Avondreset tonen "Inhoud volgt" |
| §5 Instellingen | gedaan, incl. privacy-tekst en knop naar privacyscherm |
| §5 Privacy | gedaan; link naar volledige verklaring verschijnt zodra `PRIVACY_URL` is ingevuld |
| §6 Grounding 5-4-3-2-1 | gedaan (standaardprotocol, geen invoer nodig) |
| §6 Dagboek (lokaal) | gedaan: stemming 1-5 + notitie, lijst, verwijderen in twee tikken; Free bewaart de laatste 7 (`dagboek_7`) |
| §6 Micro-acties, Avondreset | **open**: inhoud ontbreekt, zie onder |
| §7 `leefnu-local` {sessions, journal, settings}, export, wissen | gedaan; sessies ≥ 5 s worden gelogd; laatst gekozen protocol wordt hersteld |
| §7 backup-herinnering (opt-in) | gedaan: na 30 dagen zonder export, alleen zichtbaar in Instellingen |
| §8 PWA | gedaan |
| §9 logo | **open**: tijdelijk SVG volgens omschrijving |
| §10 toegangscontrole Free/Reset/Care | gebouwd: Mollie-betaling, webhook, Ed25519-token, offline verificatie, koop- en herstelflow in het niveauscherm. Actief zodra `TOKEN_PUBLIC_KEY` is ingevuld en de API draait; tot dan Free met "Binnenkort". Care heeft nog geen prijs en is niet koopbaar |
| §2 anonimiseringssignaal naar server bij verwijderen | **niet gebouwd**, zie onder |

## Open punten (beslissing of input nodig)

1. **Micro-acties en Avondreset**: dit is klinische inhoud. Lever de teksten/stappen aan,
   dan worden het schermen zoals Grounding.
2. **Logo**: vervang `public/icon.svg` door `LeefNu_Logo_Transparent.svg`. Voor maskable
   icons is een gevuld vlak van 512×512 nodig; de transparante variant kan daarnaast als
   favicon dienen.
3. **Privacyverklaring**: vul `PRIVACY_URL` in `src/lib/config.js`.
4. **Toegangscontrole**: gebouwd en getest, maar niet uitgerold. Nodig: sleutelpaar maken,
   API op de server, nginx-locatie, publieke sleutel in `config.js`. Zie `server/README.md`.
   Crisis, adem, grounding en spraak zitten in Free en blijven altijd beschikbaar.
5. **Export is in alle niveaus beschikbaar**, hoewel de live bundle `export` pas bij Reset
   zet. Reden: spec §2 belooft export als privacyrecht, en zonder export kan een Free-gebruiker
   zijn dagboek niet bewaren voordat de limiet van 7 het overschrijft. Bewuste afwijking;
   terugdraaien is één regel in `Instellingen.jsx` als je dat toch wilt.
6. **Anonimisering bij verwijderen**: zonder account of token in de app is er niets om naar
   de server te sturen. Dit hoort bij punt 4. De privacytekst zegt nu eerlijk dat dit niet
   automatisch gebeurt.
7. **Protocoltijden** (4-2-6, 4-0-8, 5-5-5, 4-7-8) zijn gangbare varianten, nog inhoudelijk
   te toetsen.
8. **Features uit de live bundle die niet in de spec en niet in deze code zitten**: check-in
   (8 staten), training (Starter/Alle/Getraind), weekpatroon, personalisatieprofiel,
   context-acties, PDF-rapport, coach-export, mantelzorger-modus en spraak via Piper. De
   niveau-labels noemen ze wel. Besluit nodig: horen die bij dit project, of is de live
   bundle een andere codebase?
9. **Spraak** gebruikt nu de Web Speech API van het toestel (`nl-BE`), niet Piper. Piper
   offline vereist een WASM-runtime en een stemmodel van tientallen MB in de bundle.

## Verificatie

- `npm run build` zonder waarschuwingen (Vite 5.4), voor `src/` en voor de gegenereerde
  `geheel/LeefNu.jsx`.
- Playwright-rooktest tegen de productie-build, 52 controles: palet, offline-badge (online en
  offline), noodscherm (zes tel-links in volgorde, focus op 1813, tapdoel ≥ 48 px, Escape),
  dagboeklimiet van 7 in Free, niveauscherm (Free huidig, Reset/Care "Binnenkort"), automatische start vanuit
  noodscherm, ringen + progress-animatie, fasewissel na 4 s, sessie gelogd, protocol zonder
  vasthouden, protocol onthouden, kaart → Adem, Grounding volledig doorlopen, Dagboek
  (verplichte stemming, opslaan, verwijderen in twee stappen), tellers, noodcontact, grote
  tekst na herladen, backup-herinnering + export + bestandsnaam, verminderde animatie zonder
  animatie, privacyscherm, wissen in twee stappen met lege opslag, SW-registratie, geen
  console-fouten.
- Niet getest in deze omgeving: trilling en spraak op echte iOS/Android-toestellen. iOS Safari
  ondersteunt `navigator.vibrate` niet; de app toont dat dan als "niet ondersteund".
