# LeefNu – juridische documenten

Concepten, geschreven op 6 november 2026 voor de live site https://leefnu.app, aangevuld met
bedrijfsgegevens uit het KBO en Johnny's eigen documenten (aangeleverd via de sessie
"LeefNu server audit", 6 november 2026).
Status: **nog niet geldig**. Pas na invullen van de resterende velden, de beslispunten,
controle door een jurist en publicatie op de site.

| Bestand | Inhoud | Live-pad (voorstel) |
|---|---|---|
| `algemene-voorwaarden.md` | gebruik, plannen, betaling, aansprakelijkheid, klachten | `/voorwaarden` |
| `privacyverklaring.md` | welke gegevens, waarom, hoe lang, rechten | `/privacy` |
| `opzegging.md` | hoe je stopt, wat er dan gebeurt | `/opzeggen` |
| `herroeping.md` | 14 dagen bedenktijd, modelformulier, online herroepingsfunctie | `/herroepen` |

## Ingevuld, met bron

| Gegeven | Waarde | Bron |
|---|---|---|
| Exploitant | Johnny Smets, eenmanszaak, handelend als Consult Coaching / Wings2Fly.AI | KBO (naam "Smets, Johnny", natuurlijk persoon); handelsnaam uit eigen offertes en annulatieclausules 06-10-2026. **Dat LeefNu onder deze eenmanszaak valt, is een logische lezing; laat Johnny het bevestigen.** |
| Ondernemingsnummer | 0534.767.334 | KBO, actief sinds 05-12-2018 |
| Btw | BE 0534.767.334, btw-plichtig | KBO (onderworpen sinds 05-12-2018); consumentenprijzen dus incl. 21 % btw |
| Adres | Commandant Leroystraat 27, 3950 Bocholt | factuur W2F-008 (04-11-2025), offerte 08-10-2026, Academy-privacybeleid 21-09-2026 |
| Contact-e-mail | johnny.smets@wings2fly.ai | besluit Johnny, 6 november 2026 (via sessie "LeefNu server audit"); ook het KBO-adres |

## Nog in te vullen

| Veld | Opmerking |
|---|---|
| `[[TELEFOON]]` | **KEUZE**: +32 484 24 44 18 staat publiek in het KBO; wettelijk volstaat e-mail. Niet publiceren = regel schrappen. |
| `[[HOSTINGLOCATIE]]` | land van het Hetzner-datacenter van 178.105.122.1 (Duitsland of Finland); te lezen in het Hetzner-paneel |
| `[[MAILDIENST]]` | wie verstuurt de inlogcodes (OTP-mails)? Niet gevonden. Die dienst is een verwerker en hoort in privacy §4. |
| `[[BEWAARTERMIJN]]` | dagen na einde niveau tot verwijdering accountgegevens; voorstel 30 |
| `[[LEEFTIJD]]` | minimumleeftijd betaalde plannen; nergens vastgelegd, voorstel 18 |
| `[[DATUM]]` | ingangsdatum |

Let op: johnny.smets@wings2fly.ai is een Wings2Fly-adres op LeefNu-pagina's. Dat is toegestaan
zolang de exploitant (§1 voorwaarden) dezelfde eenmanszaak is; het bevestigt wel het beeld
dat LeefNu onder Wings2Fly.AI valt. Verandert dat later, dan ook dit adres.

Zoek op `[[` voordat iets live gaat; er mag er geen één overblijven.

## Beslispunten

1. **Prijzen.** Live: Free, Reset €5/maand, Care €15/maand; het OneDrive-document
   "LeefNu_Beslissingsdocument_B2C_B2B_Coaching" noemt dat "DEFINITIEF". Het besluit van
   7 november op de branch is Reset €49 eenmalig voor 12 maanden, zonder maandprijzen; de
   Mollie-code op de branch controleert op €49,00. De documenten beschrijven beide vormen
   omdat opzegging en herroeping verschillen. Eén vorm moet eruit, en code, site en documenten
   moeten dezelfde zeggen. Testpiloten betalen niets (handleiding 26-09).
2. **Telefoonnummer bij registratie.** Verwerkt volgens het eigenaarsbesluit van 24-09:
   alleen bewaren, doel accountherstel en contact, aparte opt-in, geen sms. "Crisisopvolging"
   staat er bewust niet in: dat vereist eerst een juridische en medische toets. De live app
   vraagt het nummer nu verplicht en zonder opt-in; dat moet eerst aangepast, anders de rij
   schrappen. Advies blijft: niet vragen als het niet nodig is.
3. **Herroeping.** Het concept kiest volledige terugbetaling binnen 14 dagen, ook na gebruik.
   Johnny's eigen concept-annulatieclausules (06-10-2026, Y.3 en Y.5) kiezen de strikte
   variant: evenredig bedrag na gevraagde start, en verval van het recht na uitdrukkelijke
   toestemming plus erkenning vóór activering. Beide zijn wettelijk. De strikte variant
   vereist die toestemming en erkenning op de betaalknop in de app; die is er nog niet. Kies,
   en pas `herroeping.md` §2 en `algemene-voorwaarden.md` §6 aan. Y.7 van dat concept is
   volgens het verslag van 07-10 verouderd en is niet overgenomen.
4. **Online herroepingsfunctie.** Europees: richtlijn (EU) 2023/2673, art. 11bis van
   richtlijn 2011/83/EU, vanaf 19 juni 2026. Belgisch volgens Johnny's wetsdossier van
   07-10: verplicht sinds 14 augustus 2026, WER VI.61/2. **Niet geverifieerd**; de jurist
   vult de juiste verwijzing in. Functioneel: een knop "Overeenkomst herroepen" in de app die
   een bevestiging met datum en tijd oplevert. Die knop bestaat nog niet; ook de opzegknop
   bestaat nog niet.
5. **Bevoegde rechtbank.** De voorwaarden zeggen "de rechtbanken bevoegd voor onze zetel in
   Bocholt" zonder de rechtbank te noemen. Johnny's wetscontrole-dossier (08-10) noemt
   ondernemingsrechtbank Antwerpen, afdeling Tongeren, of vredegerecht Bree; te verifiëren.
   Consumenten houden altijd hun eigen woonplaatsforum.
6. **Aanspreekvorm.** De app zegt "je"; de documenten ook.

## Wat de documenten níet doen

- Ze verwijzen niet naar het Europese ODR-platform; dat is in juli 2025 gesloten.
- Ze schrijven niet "KvK": in België is het het ondernemingsnummer (KBO).
- Ze beloven geen anonimiseringssignaal vanuit de app naar de server; dat bestaat nog niet.
  Zodra het bestaat: `privacyverklaring.md` §7 en `opzegging.md` §3 aanpassen.
- Ze noemen geen Piper of ElevenLabs: spraak loopt op de branch via de spraakfunctie van het
  toestel; de live app heeft een eigen `/api/tts` met Piper (verslag 24-09). Zodra duidelijk
  is wat live gaat, hoort de spraakverwerking (tekst van de fase-aanwijzingen, geen
  persoonsgegevens) in privacy §2.
- Ze zijn geen medisch advies en zeggen dat ook; de disclaimers uit de testpiloot-handleiding
  (26-09) zijn letterlijk overgenomen in voorwaarden §2.

## Publiceren

De documenten zijn Markdown. Voor de site: omzetten naar statische HTML-pagina's naast de
app, of als schermen in de app tonen. Mollie controleert het websiteprofiel op: voorwaarden,
privacybeleid, bedrijfsgegevens en een duidelijke prijs- en herroepingsregeling, allemaal
bereikbaar zonder in te loggen. Het profiel staat op "Offline"; deze documenten zijn één van
de vereisten, niet per se de enige oorzaak.
