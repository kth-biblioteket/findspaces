## Mål
Redigera-dialogen i admin är idag en lång vertikal lista av ~25 fält där SV/EN varvas, bilder, texter, länkar, filter och realtidsdata ligger blandat. Målet: enklare att hitta rätt, mindre scrollning, tydligare språkhantering, snyggare footer.

Alla ändringar sker i `src/routes/admin.tsx` (dialog-blocket runt rad 778–1272) plus små CSS-tokens vid behov. Ingen ändring i databas, API, RLS eller studentvyn.

## Ändringar

### 1. Flikad dialog istället för lång scroll
Dela innehållet i 5 flikar (shadcn `Tabs`) inuti `DialogContent`:

1. **Grund** — Typ av lokal, namn (SV/EN), slug, våningsplan, ligger i, antal platser (studie/nedslag/dator).
2. **Filter** — Arbetssätt + alla övriga filterkategorier (ljud, utrustning, faciliteter, lokaltyp, taggar).
3. **Texter** — Beskrivning, notis, info-text, `description_inline`-toggle.
4. **Bilder & länkar** — Bilduppladdning/dropzone, kart-URL, boknings-URL:er, grupp-URL, book-now-URL.
5. **Avancerat** — Realtidsdata (Countmatters sensor + toggle), tekniskt ID, sort_order-info.

Fliknamn får en liten räknare/prick när fliken innehåller ifyllda fält, så man ser var något är angivet.

### 2. SV/EN sida vid sida
Alla språkpar (namn, våningsplan, ligger i, beskrivning, notis, info, kart-URL, boknings-URL:er) läggs i ett 2-kolumns grid på desktop med rubrikerna **SV** och **EN** ovanpå kolumnerna en gång per sektion — istället för att upprepa "(SV)" och "(EN)" på varje label. På mobil staplas det som idag.

En liten "Kopiera från SV → EN"-knapp vid varje engelskt fält som är tomt, för att snabbt duplicera texten som utgångspunkt för översättning.

### 3. Sticky header + footer
- `DialogHeader` blir sticky överst med lokalens namn + typ-pill + synlighetsstatus (Synlig / Dold).
- `DialogFooter` blir sticky nederst med **Avbryt**, **Spara** och en sekundär meny (⋯) för "Dölj/Visa", "Duplicera lokal", "Radera" (radera bara om dold, som idag).
- Sparknappen visar "Osparade ändringar" när `form` skiljer sig från senast sparade tillstånd; disable när inget är ändrat.

### 4. Bättre hjälp för länksyntax
Länk-syntaxen (`[[slug|text]]`, `<a href>`) är idag upprepad tre gånger i tre olika textstycken. Ersätt med en **återanvändbar hjälpkomponent** `<LinkSyntaxHelp />` som visas som en liten "Länksyntax"-knapp bredvid varje relevant textarea; klick öppnar en popover med exemplen. Minskar visuellt brus utan att gömma hjälpen.

### 5. Bildsektionen: större yta + drag-omordning
- Bildsektionen får hela flikens bredd (idag krympt av grannfält).
- Miniatyrerna visas i 3:2 (matchar riktig ratio, som i listan).
- Behåll dnd-kit för omordning; lägg till "primär bild"-badge på första bilden och en förklaring om att första bilden används som kort-thumbnail.

### 6. Filter-fliken: gruppering
Kategorierna renderas som collapsible sektioner (`details/summary`) i logisk ordning: Ljud → Utrustning → Faciliteter → Lokaltyp → övriga taggar. Sektioner med val är öppna som default; tomma är kollapsade. Snabbknapp "Rensa alla filter för denna lokal".

### 7. Fältetiketter matchar studentvyn
- "Arbetssätt per lokal" → "Hur vill du arbeta?" (samma text som filtret heter i studentvyn nu)
- "Typ av lokal" → "Vad letar du efter?" (matchar filtret)
- Hjälptexten under typ-pillsen förkortas till en rad.

### 8. Tangentbord & tillgänglighet
- `Cmd/Ctrl+S` sparar från dialogen.
- `Esc` frågar innan stängning om osparade ändringar.
- Tab-ordning: header → flikar → fält i fliken → footer.
- Fokusring på flikar och på hela knappar-som-kort.

## Bevaras oförändrat
- All datamodell (`FormState`, `spaceToForm`, save-payload).
- Alla mutations, RLS, i18n-nycklar för studentvyn.
- Bildprocessering och dropzone-logik.
- Kortlistans layout utanför dialogen.

## Teknisk kort­fakta
- `Tabs` från shadcn (redan används i toppnavigeringen i admin).
- Osparade-ändringar upptäcks genom `JSON.stringify(form) !== JSON.stringify(originalForm)`; `originalForm` sätts när `openEdit(space)` körs.
- `LinkSyntaxHelp` blir en liten Popover-komponent inline i filen — inga nya bibliotek.
- Sticky footer: `DialogContent` byter till `flex flex-col`, mittinnehåll `flex-1 overflow-y-auto`, footer får `sticky bottom-0 bg-card border-t`.
- Ingen migration, inga nya kolumner, ingen ändring av `Space`-typen.
