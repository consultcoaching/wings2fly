# Privacyverklaring LeefNu

Versie 0.1 (concept) · ingangsdatum [[DATUM]]

Deze verklaring legt uit welke gegevens LeefNu verwerkt, waarom, hoe lang, en wat je rechten
zijn. Ze geldt voor https://leefnu.app en de geïnstalleerde web-app.

## 1. Verwerkingsverantwoordelijke

[[BEDRIJFSNAAM]], [[ADRES]], ondernemingsnummer [[KBO]].
Vragen over privacy: [[EMAIL]].

## 2. Het uitgangspunt: alles wat over jou gaat, blijft op je toestel

LeefNu is gebouwd zodat de gevoelige gegevens nooit bij ons terechtkomen.

| Op je toestel (wij zien dit niet) | Op onze server (alleen dit) |
|---|---|
| ademsessies (welk protocol, hoe lang) | e-mailadres |
| dagboek: stemming en notities | naam |
| instellingen, noodcontact | telefoonnummer (zie §3) |
| welk niveau je hebt (lokaal token) | betaalstatus: welk niveau, tot wanneer, betaal-ID |
| | inlogcodes (kort geldig) |

De app heeft geen analytics, geen trackers, geen advertenties en geen koppeling met
sociale media. De browser praat alleen met leefnu.app (Content-Security-Policy
`connect-src 'self'`). Het noodscherm en de ademoefening doen geen enkele netwerkaanvraag.

## 3. Welke gegevens, waarvoor, op welke grond

| Gegeven | Doel | Grondslag | Bewaartermijn |
|---|---|---|---|
| e-mailadres | account, inlogcode, bevestiging van betaling, verplichte meldingen over je abonnement | uitvoering van de overeenkomst | tot [[BEWAARTERMIJN]] dagen na einde van je betaalde niveau |
| naam | aanspreking in e-mails, factuur op verzoek | uitvoering van de overeenkomst | idem |
| telefoonnummer | **[[DOEL TELEFOONNUMMER]]** | **[[GRONDSLAG]]** | idem |
| betaalstatus (niveau, einddatum, Mollie-betaal-ID) | toegang tot het betaalde niveau, terugbetalingen, bewijs bij geschil | uitvoering van de overeenkomst; wettelijke plicht (boekhouding) | niveau en einddatum: tot [[BEWAARTERMIJN]] dagen na einde; betaalgegevens voor de boekhouding: 7 jaar |
| inlogcode | aanmelden | uitvoering van de overeenkomst | tot gebruik of vervaltijd, maximaal 24 uur |
| serverlogboeken (IP-adres, tijdstip, opgevraagde pagina) | beveiliging, storingen | gerechtvaardigd belang (veilig houden van de dienst) | maximaal 14 dagen |
| je berichten aan ons | je vraag of klacht beantwoorden | gerechtvaardigd belang / overeenkomst | tot 1 jaar na afhandeling |

> **Beslispunt**: de live app vraagt een telefoonnummer bij registratie. Zolang er geen
> concreet doel is, mag het niet gevraagd worden. Vul het doel in of schrap het veld in de app
> en deze rij.

Wij nemen geen geautomatiseerde beslissingen over jou en bouwen geen profielen.

## 4. Met wie wij gegevens delen

- **Mollie B.V.**, Keizersgracht 126, 1015 CW Amsterdam, Nederland: verwerkt je betaling.
  Mollie is daarvoor zelf verwerkingsverantwoordelijke en heeft een eigen privacyverklaring.
  Wij ontvangen van Mollie alleen de status van de betaling, het bedrag en het betaal-ID; wij
  zien geen kaart- of rekeningnummers.
- **Hetzner Online GmbH**, Gunzenhausen, Duitsland: hosting van onze server in
  [[HOSTINGLOCATIE]], binnen de Europese Unie. Hetzner is verwerker onder een
  verwerkersovereenkomst.
- Verder delen wij niets met niemand, tenzij de wet ons daartoe verplicht.

Gegevens verlaten de Europese Economische Ruimte niet.

## 5. Beveiliging

- Verbinding via HTTPS. Inloggen met een eenmalige code, geen wachtwoorden die kunnen lekken.
- De server bewaart het minimum (§2). Wat niet op de server staat, kan daar ook niet lekken.
- Toegang tot de server is beperkt tot [[BEDRIJFSNAAM]] en beveiligd met sleutels.
- Een datalek dat een risico voor jou inhoudt, melden we binnen 72 uur aan de
  Gegevensbeschermingsautoriteit en, bij hoog risico, aan jou.

## 6. Je rechten

Je hebt recht op inzage, verbetering, verwijdering, beperking, overdraagbaarheid en bezwaar.
Een verzoek stuur je naar [[EMAIL]]; we antwoorden binnen een maand. Om te vermijden dat
iemand anders zich voor jou uitgeeft, sturen we een bevestigingscode naar het e-mailadres van
je account.

Ben je niet tevreden, dan kun je klacht indienen bij de Gegevensbeschermingsautoriteit,
Drukpersstraat 35, 1000 Brussel, https://www.gegevensbeschermingsautoriteit.be.

## 7. Verwijderen

**Op je toestel**: via Instellingen › Verwijder alles wis je in één keer alle lokale gegevens.
Dat kunnen wij niet voor je doen en ook niet ongedaan maken. Maak eerst een export als je
iets wilt bewaren.

**Op onze server**: stuur een verzoek naar [[EMAIL]] of zeg je niveau op (zie *Opzegging*).
Wij verwijderen je e-mailadres, naam en telefoonnummer binnen [[BEWAARTERMIJN]] dagen na het
einde van je betaalde niveau. Betaalgegevens die we voor de boekhouding moeten bewaren,
anonimiseren we: ze zijn dan niet meer aan jou te koppelen.

> In deze versie stuurt de app bij "Verwijder alles" **geen** signaal naar de server. Het
> wissen op de server gebeurt op jouw verzoek of automatisch na afloop. Zodra de app dat
> signaal wel stuurt, wordt deze alinea aangepast.

## 8. Cookies en lokale opslag

LeefNu gebruikt geen cookies voor tracking of marketing. De app bewaart gegevens in de
lokale opslag van je browser (`localStorage`) en in een cache voor offline gebruik
(service worker). Dat is strikt noodzakelijk voor de werking en vereist geen toestemming.
Voor inloggen gebruikt de site een technisch noodzakelijke sessiecookie of een lokaal token.

## 9. Kinderen

Het gratis niveau mag je gebruiken vanaf 13 jaar. Voor een betaald niveau moet je minstens
[[LEEFTIJD]] jaar zijn. Wij verzamelen niet bewust gegevens van jongere kinderen; merken we
dat toch, dan verwijderen we ze.

## 10. Wijzigingen

Wijzigt deze verklaring wezenlijk, dan melden we dat in de app en per e-mail als je een
account hebt. De geldende versie staat altijd op https://leefnu.app/privacy, met datum.
