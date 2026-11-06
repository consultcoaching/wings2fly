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
│   │   └── device.js            capability-checks (trilling, spraak)
│   ├── hooks/
│   │   ├── useLocalData.js      één bron voor sessions/journal/settings
│   │   ├── useBreathing.js      ademmotor (interval + cleanup)
│   │   └── useOnline.js         online/offline-status
│   ├── components/BreathRings.jsx   3 ringen + progress-ring + teller
│   └── screens/                 Start, Adem, Meer, Grounding, Dagboek,
│                                Instellingen, Privacy, Crisis
├── scripts/build-geheel.mjs     genereert geheel/LeefNu.jsx uit src/
└── geheel/LeefNu.jsx            GEGENEREERD, niet met de hand bewerken
```

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
| §5 Noodhulp | gedaan; eerste belknop krijgt focus, Escape sluit, noodcontact uit lokale instellingen |
| §5 Meer: 8 kaarten | gedaan; protocollen openen Adem, Grounding en Dagboek hebben een scherm, Micro-acties en Avondreset tonen "Inhoud volgt" |
| §5 Instellingen | gedaan, incl. privacy-tekst en knop naar privacyscherm |
| §5 Privacy | gedaan; link naar volledige verklaring verschijnt zodra `PRIVACY_URL` is ingevuld |
| §6 Grounding 5-4-3-2-1 | gedaan (standaardprotocol, geen invoer nodig) |
| §6 Dagboek (lokaal) | gedaan: stemming 1-5 + notitie, lijst, verwijderen in twee tikken |
| §6 Micro-acties, Avondreset | **open**: inhoud ontbreekt, zie onder |
| §7 `leefnu-local` {sessions, journal, settings}, export, wissen | gedaan; sessies ≥ 5 s worden gelogd; laatst gekozen protocol wordt hersteld |
| §7 backup-herinnering (opt-in) | gedaan: na 30 dagen zonder export, alleen zichtbaar in Instellingen |
| §8 PWA | gedaan |
| §9 logo | **open**: tijdelijk SVG volgens omschrijving |
| §10 toegangscontrole Free/Reset/Care | **niet gebouwd**, zie onder |
| §2 anonimiseringssignaal naar server bij verwijderen | **niet gebouwd**, zie onder |

## Open punten (beslissing of input nodig)

1. **Micro-acties en Avondreset**: dit is klinische inhoud. Lever de teksten/stappen aan,
   dan worden het schermen zoals Grounding.
2. **Logo**: vervang `public/icon.svg` door `LeefNu_Logo_Transparent.svg`. Voor maskable
   icons is een gevuld vlak van 512×512 nodig; de transparante variant kan daarnaast als
   favicon dienen.
3. **Privacyverklaring**: vul `PRIVACY_URL` in `src/lib/config.js`.
4. **Toegangscontrole**: vereist een server die betaling koppelt aan een token, plus een
   besluit welke protocollen "basis" zijn. Een puur lokale controle is triviaal te omzeilen.
   Aanbeveling: SOS, minstens één ademprotocol en Grounding nooit achter een betaalmuur.
5. **Anonimisering bij verwijderen**: zonder account of token in de app is er niets om naar
   de server te sturen. Dit hoort bij punt 4. De privacytekst zegt nu eerlijk dat dit niet
   automatisch gebeurt.
6. **Protocoltijden** (4-2-6, 4-0-8, 5-5-5, 4-7-8) zijn gangbare varianten, nog inhoudelijk
   te toetsen.
7. **Zelfmoordlijn**: 1813 is Belgisch. Voor Nederlandse gebruikers hoort 113 erbij.

## Verificatie

- `npm run build` zonder waarschuwingen (Vite 5.4), voor `src/` en voor de gegenereerde
  `geheel/LeefNu.jsx`.
- Playwright-rooktest tegen de productie-build, 45 controles: palet, offline-badge (online en
  offline), noodscherm (tel-links, focus, tapdoel ≥ 48 px, Escape), automatische start vanuit
  noodscherm, ringen + progress-animatie, fasewissel na 4 s, sessie gelogd, protocol zonder
  vasthouden, protocol onthouden, kaart → Adem, Grounding volledig doorlopen, Dagboek
  (verplichte stemming, opslaan, verwijderen in twee stappen), tellers, noodcontact, grote
  tekst na herladen, backup-herinnering + export + bestandsnaam, verminderde animatie zonder
  animatie, privacyscherm, wissen in twee stappen met lege opslag, SW-registratie, geen
  console-fouten.
- Niet getest in deze omgeving: trilling en spraak op echte iOS/Android-toestellen. iOS Safari
  ondersteunt `navigator.vibrate` niet; de app toont dat dan als "niet ondersteund".
