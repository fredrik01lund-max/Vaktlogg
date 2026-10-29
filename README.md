# Vaktlogg – klikkbar prototype

«Strava for arbeidsdagen» for servitører og bartendere. Under og etter vakten ser den ansatte sitt eget salg, tips og (valgfritt) skritt og puls. Appen gir anerkjennelse for rekorder, gjør kvelden til et frivillig lagspill, og lar arbeidsgiver gi premier og takk – uten å se tallene til den enkelte.

> **Dette er en demo med fiktive data.** Ingen innlogging, ingen backend og ingen ekte kassesystem eller klokke. Personer, restaurant og tall er oppdiktet.

Prinsippene prototypen viser:

- Dataene tilhører den ansatte.
- All konkurranse er frivillig, og «Rolig modus» skjuler den.
- Arbeidsgiver ser bare laget som helhet, etter vakten – aldri tallene, skrittene eller pulsen til én person.
- Ingen rangering bygger på puls eller skritt, og sammenligning skjer bare innenfor samme vakt.
- Ingen konkurranser på alkohol, og ingen negative varsler.
- Anerkjennelse veier tyngre enn press: ros, takkekort og felles gaver.

## Hva prototypen viser

| Funksjon | Hvor | Hva man ser |
| --- | --- | --- |
| **Kveldens spill** | Vaktstart | Fire kort: **Duell** (én mot én med handikap), **Makker** (to sammen mot et felles dessertmål), **Laget** (bare lagringen) og **Rolig** (bare din egen ring). Velges før vakten. |
| **Vaktsiden: fire bokser** | Vakt | Helse, Salg, Konkurranse og Gjester – hver med ett stort tall og en liten levende illustrasjon (pulskurve, salg per halvtime, duellen, bordkart). Trykk på en boks for alle detaljene om temaet. |
| **Helse** | Vakt → Helse | Hjertet slår i takt med pulsen. Detaljsiden viser stress gjennom kvelden (anslått fra pulsen: lav, middels, høy), pulskurven og når Emma var mest i bevegelse. Bare når klokka er på. |
| **Salg** | Vakt → Salg | Salg og tips live, mot rekorden, per halvtime, per bord (med tips) og mest solgte retter. |
| **Konkurranse** | Vakt → Konkurranse | Boksen viser kveldens spill. Detaljsiden har gullmedaljen øverst (årets lagmål, med arket «Om reisen»), deretter alle pågående konkurranser og mål: duellen eller makkeren, lagmålet mot forrige fredag (spøkelset), rekorden, vaktbingoen, ukens rett og premiene. Rolig modus slås av og på her. |
| **Gjester** | Vakt → Gjester | Aktive bord og bord igjen, med varsel om allergi. Detaljsiden har «Viktig nå» øverst (forsinkede bord, allergier, neste booking, ønsker) og et bordkart over lokalet der Emmas seksjon er fremhevet: grønn = aktiv, rød = forsinket, gul = betalt, grå = ledig, klokke = booking senere. Trykk på et bord for å gå til det i listen over bord og bookinger. |
| **Vaktbingo** | Vakt → Konkurranse | Et 3 × 3-brett med øyeblikk (bursdag, allergi, stamgjest …) som hele laget fyller sammen. Ansiktene viser hvem som fikk ruten. |
| **Premiestige** | Mål | Premier gjelder mål over en periode, aldri én vakt – og jo større og lengre mål, jo større premie: øverst gullmedaljen – årets lagmål satt av ledelsen: når serveringslaget selger for 8,5 mill. kr i 2026, reiser hele laget på firmatur til en vinprodusent i Bourgogne (6 dager med kurs og ferie). Deretter staff dinner på restauranten (6 av 10 helgevakter i oktober), kinobilletter for to (over ditt eget dessertsnitt på 5 vakter) og pizza etter stengetid (ukens rett, 70 porsjoner). |
| **Din september** | Historikk → «Din september er klar» (eller `#/maned/2026-09`) | Månedsoppsummeringen som en illustrert historie på 11 kort som spiller av seg selv: kalenderen som lyser opp, restauranten fylt med gjester, en lang kassalapp, «Gjett månedens rett» under tre lokk, et dessertbrett, rekordtrappen, postkort fra beste vakt, gangstien mot maraton, ros fra kollegene, månedens type og et delekort der Emma selv velger hva andre får se. |
| **Takkekort fra Kari** | Sluttrapporten | En konvolutt som åpnes med et trykk. Kortet peker på et ekte øyeblikk (bursdagsbordet på 15). Kommer etter vakten. |
| **Nivå og XP** | Meg | Salg, tips, medaljer (milepæler) og trofeer (personlige rekorder) blir XP og et nivå. Kvelden gir nytt nivå (42 → 43) og én ny medalje. Trykk på kortet for hvor XP-en kommer fra og alle medaljene. |
| **Personalmenyen** | Meg → Personalmenyen | Poletter tjent på det Emma styrer selv (hver 4. vakt, lagmål, egen fremgang, ta en vakt) – aldri salg, tips eller kudos. Bestilles fra en meny: Tid, Smak, Gaver (med lagkassa) og en hemmelig meny som nivået låser opp. Sparebøsse mot et gavekort på 5 000 kr; over den skattefrie gavegrensen får Emma en advarsel. Vaktønsker godkjennes på Karis telefon; Kari ser bare budsjett og populære retter. Kvelden gir +1 polett (lagmålet). Data i `staffMenu` (demoData), logikk i `src/lib/wallet.ts`. |
| **Karis telefon** | Demo-kontrollen → **K** (eller `#/sjef`) | Én lagring (først etter vakten), fem like låste personkort, og tre verktøy: Premier (hele premiestigen), Takkekort og Ukens rett. |
| **Ukens rett** | Mål → Denne uka | Lagmål for uka: 70 porsjoner av ukens rett (aldri alkohol) gir pizza etter stengetid. |

---

## Kjøre lokalt

Du trenger [Node.js](https://nodejs.org) versjon 22.18 eller nyere (24 anbefales).

```bash
npm install
npm run dev
```

Åpne adressen som vises i terminalen (vanligvis `http://localhost:5173`). På en bred skjerm vises appen i en telefonramme. På mobil fyller den hele skjermen. Dev-serveren lytter på nettverket, så du kan også åpne den fra mobilen på samme wifi.

Andre kommandoer:

| Kommando | Hva den gjør |
| --- | --- |
| `npm run build` | Bygger en statisk versjon i `dist/` |
| `npm run preview` | Viser den bygde versjonen lokalt |
| `npm run verify` | Skriver ut alle beregnede demo-tall og sjekker at de henger sammen |
| `npm run qr -- <url>` | Lager en QR-kode (PNG) som peker til den publiserte siden |

## Publisere på GitHub Pages

1. **Lag et repo på GitHub**, for eksempel `vaktlogg`. Det kan være offentlig eller privat (privat krever en betalt GitHub-plan for Pages).
2. **Last opp koden.** Fra denne mappen:
   ```bash
   git init
   git add .
   git commit -m "Vaktlogg-prototype"
   git branch -M main
   git remote add origin https://github.com/<brukernavn>/vaktlogg.git
   git push -u origin main
   ```
3. **Skru på Pages.** På GitHub: *Settings → Pages → Build and deployment → Source:* velg **GitHub Actions**.
4. **Vent på bygget.** Workflowen i `.github/workflows/deploy.yml` kjører automatisk ved hver push til `main`. Følg den under fanen *Actions*. Den sjekker demo-tallene, bygger og publiserer.
5. **Åpne siden** på `https://<brukernavn>.github.io/vaktlogg/`.

Base-stien settes automatisk til repo-navnet (`/vaktlogg/`), så det virker selv om du kaller repoet noe annet. Appen bruker hash-basert navigasjon (`…/vaktlogg/#/historikk`), så oppfrisking og delte lenker gir aldri 404.

### QR-kode til presentasjonen

```bash
npm run qr -- https://<brukernavn>.github.io/vaktlogg/
```

Filen `qr-vaktlogg.png` (1024 × 1024 px) havner i prosjektmappen. Vil du slippe å skrive adressen hver gang, legg til `"homepage": "https://<brukernavn>.github.io/vaktlogg/"` i `package.json` og kjør bare `npm run qr`.

### Teste produksjonsbygget lokalt med base-sti

PowerShell:

```powershell
$env:VITE_BASE = "/vaktlogg/"; npm run build; npx vite preview
```

Åpne deretter `http://localhost:4173/vaktlogg/`.

## Bytte navn, restaurant og persona

Alt som har med navn å gjøre ligger i **`src/config.ts`**:

- `appName`: arbeidsnavnet («Vaktlogg»)
- `restaurant.name`: «Brasserie Fjordgata»
- `persona`: Emma, alder, rolle, seksjon og skrittlengde (brukes for å regne skritt om til km)
- `colleagues`: vaktlaget. `sharesSales: false` gjør at en kollega vises som «Skjult».
- `duelOpponentId`: hvem Emma utfordrer i duellen
- `employer`: lederen som gir gaver og takkekort (Kari, daglig leder)
- `avatarColor`: fargen på hvert ansikt
- `restaurant.kitchenOnShift`: antall på kjøkkenet (får også lagets gave)

Bytter du id på en kollega, må samme id også brukes i `src/data/demoData.ts` (i `team.colleagues` og i `kudos`).

## Endre demo-tallene

Alle rådata ligger i **`src/data/demoData.ts`**: menyen med priser, de 14 tidligere vaktene, kveldens vakt som en liste med hendelser (30 bordsettinger i Emmas seksjon – 20 reservert og 10 walk-ins spredt utover kvelden –, bord settes, bestillinger, betaling med tips, ros, øyeblikk som bursdag), aktivitetsdata fra klokken, kollegenes tall, duellen, makkeren, lagmålet med forrige fredags kurve, vaktbingoen, Ukens rett, månedens premiemål (`periodGoals`), premiekatalogen og takkekortet.

Summer, snitt, rekorder, duellresultat, makkermål, spøkelset, bingobrettet, når gaven åpnes, lagmål-fremdrift, stempler og månedsoppsummering **beregnes** i `src/lib/calc.ts`. Lagmålet er forrige fredag + 5 %, avrundet. Ingen av disse tallene er skrevet inn for hånd, så de stemmer alltid med hverandre. Etter en endring kjører du:

```bash
npm run verify
```

Da får du se alle tallene og en sjekk av at de er realistiske og henger sammen (alle bord betalt, rekorder satt, duell og lagmål avgjort).

## Installer som app (uten App Store / Google Play)

Prototypen er en installerbar nettapp (PWA): manifest med navn og ikoner, `display: standalone` og en liten tjenestearbeider (`public/sw.js`) som mellomlagrer filene, så appen åpner uten adresselinje og virker uten nett.

1. Bygg: `npm run build` (relative stier) – eller bruk ferdig mappe **`Vaktlogg-app/`** / **`Vaktlogg-app.zip`**.
2. Legg mappen på en **https**-adresse, f.eks. dra mappen inn på [app.netlify.com/drop](https://app.netlify.com/drop), eller GitHub Pages (workflowen i `.github/workflows`).
3. Åpne adressen i Chrome:
   - **Android:** ⋮ → **Installer app** / **Legg til på startsiden** → Installer.
   - **PC/Mac:** installer-ikonet i adresselinjen, eller ⋮ → **Cast, lagre og del** → **Installer side som app**.
   - **iPhone (Safari):** Del → **Legg til på Hjem-skjerm**.
   - Når Chrome tilbyr det, ligger også **⋯ → Installer som app** i demolinjen.

Enkeltfilen `Vaktlogg-prototype.html` kan ikke installeres (filer åpnet fra disk får ikke installeres) – den må ligge på en https-adresse.

## Demo-kontrollen

Demo-kontrollen ligger utenfor appen – under telefonrammen på stor skjerm, og som en mørk stripe under appen på mobil:

- **Klappen** (den lille filmklapperen først i linjen): guiden til prototypen. Første gang prototypen åpnes, svever han inn i 3D, forteller at du er Emma og kan trykke deg rundt, lar deg velge språk, og flyr så til Start vakt (trykk på det du vil se mens vakten går), Avslutt vakt (sluttrapporten – Historikk, Goals og Meg kan ses når som helst), E/K og ⋯. Kan hoppes over, og hentes frem igjen ved å trykke på ham eller fra ⋯. På Karis telefon dukker han opp én gang per besøk og sier at lederens side er under arbeid, og ber om innspill. Han hopper, slår salto, tar en piruett, ser seg rundt, danser og trekker på skuldrene (`Move` i `klappen3d.tsx`). Three.js lastes bare når han vises (`src/klappen3d.tsx`, `src/guide.tsx`). Vises ikke med `?manuell` eller i automatiske tester; `?guide` viser ham alltid.
- **⋯**: språk (Norsk/English) øverst, så start på nytt, «Din september», installer som app og Klappens guide.

- **E / K**: bytter mellom Emmas telefon og Karis telefon (arbeidsgiver)
- **Start vakt** (her eller i appen): vakten spilles av av seg selv. Klokka går jevnt fra 16:00 til 23:30 på to minutter, og de 21 hendelsene skjer når klokka passerer dem. Etter to minutter starter vakten på nytt. Du kan utforske appen fritt mens den går – appen hopper ikke tilbake til Vakt.
- **Avslutt vakt**: avslutter vakten og åpner sluttrapporten
- **⋯**: pause/fortsett avspillingen, åpne «Din september», bytt språk, start demoen på nytt, eller skjul knappen
- **`?manuell`** i adressen gir de gamle knappene (▶ Spill av og Neste) for å gå ett steg om gangen – testene bruker dette.

Før vakten velger Emma kveldens spill. Ved **Duell** og **Makker** dukker kollegaene på vakt opp under spillene: trykk på den du vil invitere (de svarer ja etter et øyeblikk). Duellen, makkermålet, varslene og sluttrapporten følger den du inviterte. **Laget** og **Rolig** trenger ingen invitasjon.

### Månedshistorien («Din september»)

Kortene spiller av seg selv med en tidslinje øverst, som en historie på sosiale medier. Hvert kort har én illustrasjon, ett stort tall eller ord og én kort linje, og alt tegnes frem i takt med tallet.

- **Trykk** på høyre side går videre, venstre side går tilbake. **Hold inne** setter på pause (det gjør også pauseknappen, mellomrom og når fanen skjules). Piltaster, Home/End og Esc virker også.
- **Gjett!** Fjerde kort viser tre retter under lokk. Trykk på den du tror Emma bar ut mest, ellers løftes lokkene etter noen sekunder. Pause stopper også gjettingen.
- **Tilbake** viser det ferdige kortet, og **Se igjen** spiller alt på nytt.
- **Delekortet** viser bare det Emma velger (høyst seks ting). Kalenderen med vaktdagene vises bare når «Vakter» er valgt. Kollegenavn, tips, puls, alkohol og ros-meldinger deles aldri.
- **Redusert bevegelse:** ingen automatisk avspilling og ingen animasjon – kortene står ferdige, og gjettingen virker med et trykk.

Alle tallene kommer fra `monthStory()` i `src/lib/calc.ts` (sjekkes av `npm run verify`). Typen («Hjelperen») bygger på ros og kalender, aldri på salg, tips, skritt eller puls.

Appen selv har ingen demo-merker eller forklaringstekster om samtykke og personvern; de hører hjemme i førstegangsbruk og innstillinger i et ferdig produkt.

Under vakt er vaktsiden fire bokser – Helse, Salg, Konkurranse og Gjester – som fyller skjermen. Hver boks har én farge, ett stort tall og en liten illustrasjon, og leses på et blikk. Et trykk på boksen åpner temaets egen side (`#/vakt/helse`, `/salg`, `/konkurranse`, `/gjester`) med «‹ Vakt» tilbake øverst. Sidene følger vakten live mens demoen spilles av. Allergier vises alltid i rødt, også i Gjester-boksen. Hvert steg gir høyst ett varsel, og aldri et negativt.

Boksene ligger i `src/shift/` (`Overview.tsx` for forsiden, én fil per tema, `shift.css`). Ringdesignet er lagt bort, men kan fortsatt vises med `?design=d` (og de tre tidligere retningene med `?design=a`, `b` og `c`, den opprinnelige vaktsiden med `?design=original`).

Sluttoppgjøret viser fortsatt ringene og lagres automatisk i historikken når vakten avsluttes.

Lette innstillinger (rolig modus, klokke, kveldens spill, Karis premievalg og hvor langt demoen har kommet) lagres i nettleserens `localStorage`. Appen virker like godt uten. «Start demoen på nytt» nullstiller vakten.

## Teknisk

- Vite + React + TypeScript, ingen backend og ingen API-kall
- Selvhostede fonter via `@fontsource-variable` (Fraunces og Inter), ingen eksterne forespørsler
- Mobil først (390 × 844), safe-area, trykkflater på minst 44 px, ingen avhengighet av hover
- Tekststørrelser i `rem` via en fast skala i `src/styles.css` (`--fs-cap` … `--fs-mega`), så teksten følger nettleserens tekststørrelse
- Kontrast etter WCAG 2.2 AA for tekst (1.4.3) og kontroller (1.4.11)
- Respekterer «redusert bevegelse» i operativsystemet (også hjerteslaget, tellerne og overgangene)

### Bevegelse

All bevegelse følger samme tempo (`src/lib/motion.ts` og `--dur-*`/`--ease-*` i `src/styles.css`): ett demosteg setter ringer, tall, forklaring og bordprikker i gang samtidig, og alt lander innen ca. ett sekund. Bare én ting går i løkke – hjertet når klokka er på, ellers den levende prikken – og ingenting i rolig modus eller når et ark er åpent. Feiringer (ny rekord, lagmålet nådd, du tar ledelsen) skjer på ringen først, og varselet kommer like etter. Oppgjøret, premiekortene og Karis lagring tegnes frem første gang de vises, og står stille ved senere besøk.

Mappestruktur:

```
src/
  config.ts          navn, restaurant, persona, kolleger
  data/demoData.ts   alle fiktive rådata
  lib/calc.ts        alle beregninger
  lib/live.ts        varsler under vakten (gave, rekord, makker, bingo, ros, duell)
  rings.tsx          vaktringene (FlowRings): spøkelse, gave, dragkamp, perler – animert med SVG-masker
  vitals.tsx         hjerteslaget (i takt med pulsen)
  shift/             vaktsiden: fire bokser (Overview.tsx) og detaljsidene Helse, Salg, Konkurranse og Gjester
  lib/motion.ts      felles tempo, redusert bevegelse og «vist før» for avsløringer
  game-ui.tsx        ansikter, spillkort, bingobrett, stempelkort, gave, konvolutt
  game.css           stil for spill, premier og Karis telefon
  screens/           Vakt, Vaktrapport, Historikk, Mål, Meg, Employer (Karis telefon)
  wrapped/           månedshistorien: Story.tsx (avspilling, pause, tastatur), slides.tsx (de 11 kortene),
                     art/ (illustrasjonene i SVG), wrapped.css (farger per kapittel og bevegelsesbiblioteket)
scripts/
  verify-data.ts     sjekker demo-tallene
  make-qr.mjs        lager QR-kode
PRESENTASJON.md      manus for en demo på to minutter
```
