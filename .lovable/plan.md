#
Genomgång av `src/routes/index.tsx`, `src/components/FilterPanel.tsx`, `src/lib/filterMatch.ts`, `src/lib/useNarrowestFilter.ts`, `ActiveFilterChips.tsx`. De sju tidigare punkterna är åtgärdade. Kvarstår:

### Faktiska felaktigheter

1. **Öppettiderna beräknas bara en gång per rendering.** `liveActive` i `index.tsx`, `FilterPanel.tsx` och `ActiveFilterChips.tsx` räknas ut med `new Date()` vid render och har ingen timer. En skärm/iframe som står uppe hela dagen fortsätter visa "Visa bara lediga just nu", sorteringen och badgarna långt efter att schemat stängt (och tvärtom öppnar de inte automatiskt).

2. **Dolda kategorifilter i Service/Skapande.** `searchToFilters` behåller `cats` oavsett `kind`, medan `FilterPanel` döljer alla kategorisektioner i icke-studie-lägen. En delad länk som `?kind=service&cats[...]` filtrerar därför bort träffar utan att filtret går att se eller ändra i panelen (bara via chipet ovanför listan). `mode`, `size` och `free` nollställs redan korrekt — `cats` gör det inte.

3. **Sökningen matchar bara svenska lokaltyper.** `matchesSpace` jämför `q` mot `s.lokaltyp`, som innehåller svenska värden ("Grupprum"). I engelskt läge ger sökning på "group room" noll träffar trots att pillren heter så. Sökningen tittar inte heller i `floor`/`located_in` eller beskrivningen.

4. **"Antal platser"-sorteringen ser bara `capacity`.** Korten visar tre platstyper (studieplatser, nedslagsplatser, datorplatser) men `seats_desc`/`seats_asc` sorterar enbart på `capacity`. En lokal med 0 studieplatser och 40 nedslagsplatser hamnar sist.

5. **Dubbel aria-live-uppläsning.** Träffräknaren finns i två element (ett `lg:hidden`, ett `hidden lg:inline`), båda med `aria-live="polite"`. Båda ligger i DOM:en, så skärmläsare kan läsa upp antalet två gånger vid varje filterändring.

6. **"Standard" går inte att välja tillbaka för 2–4 personer.** `effectiveSort` tvingar `seats_asc` när `sort === "recommended"` och gruppstorlek 2–4 är vald, så menyvalet "Standard" ser ut att inte göra något.

### Förbättringsmöjligheter

- **Förslaget "ta bort filter" tar bort en hel kategori** i stället för det enskilda värde som kostar flest träffar. Att kunna föreslå ett enskilt alternativ ger fler användbara förslag.
- **Kategorival lagras som svensk etikett** (`o.label`) i URL:en. Byter en admin namn på ett alternativ blir gamla bokmärken/länkar tysta nolltäffar. `value_key`/id vore stabilare (större omtag).
- **Sekundär sortering saknas** för våningsplan och platsantal — inom samma värde behålls manuell ordning. Rimligt, men namn som tiebreak blir mer förutsägbart.
- **Ingen träffräkning per filteralternativ** i panelen (t.ex. "Tyst (12)"), vilket är det vanligaste sättet att undvika nolltäffar.

## Vad jag föreslår att vi bygger

**Steg 1 – Levande öppettider.** En delad hook som räknar om `liveActive` på en minuttimer (och vid fönsterfokus), så panel, chips, sortering och badgar följer schemat i realtid.

**Steg 2 – Nollställ kategorival utanför studieplatser.** `searchToFilters` ignorerar `cats` när `kind !== "study"`, och `filtersToSearch` skriver inte ut dem — samma regel som redan gäller `mode`/`size`/`free`.

**Steg 3 – Bredare och språkmedveten sökning.** `matchesSpace` matchar även lokaltypens engelska etikett (via `filter_options`), samt `floor`/`located_in`. (Beskrivningstext kan tas med om du vill — säg till.)

**Steg 4 – Platsantal som summa.** `seats_desc`/`seats_asc` sorterar på summan av studieplatser + nedslagsplatser + datorplatser, alternativt att vi byter etikett till "Antal studieplatser". Behöver ditt val.

**Steg 5 – Småfix.** Ett enda aria-live-element för träffräknaren, och "Standard" respekteras som aktivt val även vid 2–4 personer (auto-sorteringen slår bara till innan användaren rört menyn).

**Steg 6 (valfritt) – Smartare tomtillstånd.** Förslaget kan peka ut ett enskilt filteralternativ i stället för hela kategorin.

Inga databasändringar behövs; allt ligger i frontendlogiken.

### Frågor innan bygge
- Steg 4: summera alla tre platstyperna, eller bara döpa om till "Antal studieplatser"?
- Ska sökningen även leta i beskrivningstexten (fler träffar, men mer luddiga)?
- Vill du ha med steg 6 nu eller senare?
