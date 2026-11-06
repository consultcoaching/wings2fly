# LeefNu – juridische documenten

Concepten, geschreven op 6 november 2026 voor de live site https://leefnu.app.
Status: **nog niet geldig**. Pas na invullen van de velden hieronder, controle door een
jurist en publicatie op de site.

| Bestand | Inhoud | Live-pad (voorstel) |
|---|---|---|
| `algemene-voorwaarden.md` | gebruik, plannen, betaling, aansprakelijkheid, klachten | `/voorwaarden` |
| `privacyverklaring.md` | welke gegevens, waarom, hoe lang, rechten | `/privacy` |
| `opzegging.md` | hoe je stopt, wat er dan gebeurt | `/opzeggen` |
| `herroeping.md` | 14 dagen bedenktijd, modelformulier, online herroepingsfunctie | `/herroepen` |

## Invulvelden

Overal waar `[[...]]` staat, ontbreekt een gegeven dat alleen de onderneming kan leveren.
Zoek op `[[` voordat iets live gaat; er mag er geen één overblijven.

| Veld | Waar | Opmerking |
|---|---|---|
| `[[BEDRIJFSNAAM]]` | alle | handelsnaam én juridische naam, bv. "X BV, handelend als LeefNu" |
| `[[RECHTSVORM]]` | voorwaarden | BV, eenmanszaak, VZW … |
| `[[ADRES]]` | alle | maatschappelijke zetel, volledig |
| `[[KBO]]` | voorwaarden, privacy | ondernemingsnummer |
| `[[BTW]]` | voorwaarden | btw-nummer, of "btw-vrijgesteld, art. 56bis W.Btw" als dat zo is |
| `[[EMAIL]]` | alle | één adres voor klanten én privacyvragen volstaat |
| `[[TELEFOON]]` | voorwaarden | verplicht vermelden als het bestaat |
| `[[HOSTINGLOCATIE]]` | privacy | land van het Hetzner-datacenter (Duitsland of Finland) |
| `[[BEWAARTERMIJN]]` | privacy, opzegging | dagen na einde niveau tot verwijdering accountgegevens; voorstel 30 |
| `[[LEEFTIJD]]` | voorwaarden, privacy | minimumleeftijd; voorstel 18 voor betaalde plannen |
| `[[DATUM]]` | alle | datum van inwerkingtreding |

## Beslispunten (geen invulveld, wel een keuze)

1. **Prijzen.** De live site toont Free (gratis), Reset €5/maand, Care €15/maand. Het besluit
   van 7 november 2026 op de branch is Reset €49 eenmalig voor 12 maanden, zonder
   maandprijzen. De documenten beschrijven beide vormen (maandabonnement en eenmalige
   periode van 12 maanden) omdat opzegging en herroeping per vorm verschillen. Zodra de
   keuze vaststaat, schrap de andere vorm in §4 van de voorwaarden en in `opzegging.md`.
2. **Telefoonnummer bij registratie.** De live app vraagt het. De privacyverklaring moet
   zeggen waarvoor. Is er geen doel, dan niet vragen: dataminimalisatie is een plicht, en
   het is één veld minder dat een gebruiker in crisis moet invullen.
3. **Herroeping bij digitale dienst.** De wet staat toe dat het herroepingsrecht vervalt
   zodra de dienst met uitdrukkelijke toestemming volledig is geleverd, of dat je een
   evenredig deel aanrekent. Het concept kiest voor eenvoud: binnen 14 dagen volledige
   terugbetaling, zonder vragen. Dat is gunstiger dan de wet en vermijdt discussie bij
   Mollie en bij klanten. Wil je het strikter, dan moet de bestelknop een uitdrukkelijke
   toestemming plus erkenning van verlies van het herroepingsrecht bevatten.
4. **Online herroepingsfunctie.** Richtlijn (EU) 2023/2673 voegt artikel 11bis toe aan
   richtlijn 2011/83/EU: een herroepingsknop in de online-omgeving, van toepassing vanaf
   19 juni 2026. De Belgische omzetting in het Wetboek van economisch recht is in deze
   documenten **niet geverifieerd**; laat de jurist het artikelnummer invullen. Functioneel
   betekent het: een duidelijk zichtbare knop "Overeenkomst herroepen" in de app of op de
   site, die een bevestiging per e-mail oplevert. Die knop bestaat nog niet.
5. **Aanspreekvorm.** De app zegt "je". De documenten doen dat ook. Juridisch maakt het
   niet uit; consistent is beter.

## Wat de documenten níet doen

- Ze verwijzen niet naar het Europese ODR-platform; dat is in juli 2025 gesloten.
- Ze beloven geen anonimiseringssignaal vanuit de app naar de server, omdat dat nog niet
  bestaat. Zodra het bestaat: `privacyverklaring.md` §7 en `opzegging.md` §3 aanpassen.
- Ze zijn geen medisch advies en zeggen dat ook.

## Publiceren

De documenten zijn Markdown. Voor de site: omzetten naar statische HTML-pagina's naast de
app (zie het deploy-plan voor `/privacy`), of als schermen in de app tonen. Mollie
controleert het websiteprofiel op: voorwaarden, privacybeleid, bedrijfsgegevens en een
duidelijke prijs- en herroepingsregeling, allemaal bereikbaar zonder in te loggen.
