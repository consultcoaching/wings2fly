# LeefNu

Standalone crisis- en ademhalingsapp (React 18, Vite 5, vanilla CSS, Nederlands).
Werkt volledig client-side en offline; er wordt niets naar een server gestuurd.

## Structuur

```
leefnu/
├── index.html                 app-shell, noscript-fallback met 112/1813
├── public/
│   ├── manifest.webmanifest   PWA-manifest (standalone, portrait)
│   ├── sw.js                  service worker: network-first, cache als fallback
│   └── icon.svg
├── src/
│   ├── main.jsx               mount + SW-registratie (alleen in productie)
│   ├── App.jsx                tabs, SOS-knop, noodscherm, state-koppeling
│   ├── index.css
│   ├── lib/
│   │   ├── protocols.js       ademprotocollen (seconden) en fase-labels
│   │   └── storage.js         localStorage onder prefix `leefnu.`
│   ├── hooks/
│   │   ├── useBreathing.js    ademmotor (interval + cleanup)
│   │   ├── useStoredState.js  useState met persistentie
│   │   └── useSettings.js     instellingen + html-klassen
│   └── screens/               Start, Adem, Meer, Instellingen, Crisis
└── geheel/LeefNu.jsx          afgeleide één-bestandsversie (zie onder)
```

## Ontwikkelen en bouwen

```
npm install
npm run dev       # http://localhost:5173
npm run build     # output in dist/
npm run preview   # productie-build lokaal bekijken
```

Draait de app onder een subpad (bv. `/leefnu/`), zet dan `base` in `vite.config.js`
en `start_url`/`scope` in `public/manifest.webmanifest`.

## Functioneel

- **SOS** (altijd zichtbaar) opent het noodscherm: `tel:112`, `tel:1813` (Zelfmoordlijn,
  België), persoonlijk noodcontact, en "Start kalmerende adem" dat direct de oefening start.
  Eerste belknop krijgt focus; Escape sluit.
- **Adem**: vier protocollen (4-2-6, 4-0-8, 5-5-5, 4-7-8). Timer stopt bij tabwissel en
  wanneer het scherm naar de achtergrond gaat, zodat teller en feedback nooit uit de pas lopen.
- **Instellingen** (persistent): noodcontact, grote letters, verminderde animatie, trilling
  en stembegeleiding bij fasewissel, export als JSON, alles wissen (twee tikken, geen
  `window.confirm`).
- `prefers-reduced-motion` wordt ook zonder instelling gerespecteerd.

## Eén-bestandsversie (`geheel/LeefNu.jsx`)

Zelfde app, alle modules en de CSS in één bestand, voor een canvas/preview zonder
bundler. Dit bestand is **afgeleid** van `src/` en wordt niet automatisch bijgewerkt:
wijzig altijd eerst `src/` en werk daarna `geheel/LeefNu.jsx` bij. De service worker
zit er niet in (die vereist een apart bestand).

## Verificatie

- `npm run build` zonder waarschuwingen (Vite 5.4).
- Playwright-rooktest tegen de productie-build (22 controles): noodscherm met tel-links en
  focus, tapdoelen ≥ 48 px, Escape, automatische start vanuit noodscherm, fasewissel na
  4 s, protocol zonder vasthouden, persistentie na herladen, wissen in twee stappen,
  SW-registratie, geen console-fouten.
- Niet getest in deze omgeving: trilling (`navigator.vibrate`) en spraak (`speechSynthesis`)
  op echte iOS/Android-toestellen. iOS Safari ondersteunt `vibrate` niet; de app toont dat
  dan als "niet ondersteund".
