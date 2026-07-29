## Vad jag hittade (verifierat i koden)

Genomgång av `src/routes/index.tsx`, `src/lib/filterMatch.ts`, `src/lib/useNarrowestFilter.ts`, `src/components/ActiveFilterChips.tsx` och `FilterPanel.tsx`.

### Buggar

1. **"Ta bort X"-förslaget räknar fel.** `useNarrowestFilter` får hela `spaces` (alla kategorier) och matchar utan kategorifilter. När du står i Studieplatser kan förslaget alltså lova träffar som kommer från Service & faciliteter / Skapande och paus. Dessutom saknas "Visa bara lediga just nu" som riktig dimension: `matchesSpace` känner inte till `freeOnly`, så den raden får alltid samma siffra som nuläget och kan vinna rankningen felaktigt.

2. **"Visa resultat (N)" i mobilfiltret kan visa 0 fel.** `draftCount` applicerar `freeOnly` utan att kolla öppettider, och bokningsdatan (`availability`) hämtas bara när det *tillämpade* filtret redan är grupprum + ledigt. Kryssar man i rutan i utkastet blir count 0 tills man applicerat.

3. **Sökningen letar bara i svenska namn.** `matchesSpace` matchar `s.name` + `lokaltyp`, aldrig `name_en`. I engelskt läge ger sökning på det engelska namnet noll träffar. (Dokumentationen i `docs/url-schema.md` säger dessutom "endast namn" — den stämmer inte längre.)

4. **Namnsortering använder alltid svenska namnet.** `name_asc`/`name_desc` sorterar på `s.name` även i engelskt läge, så listan ser osorterad ut för engelska användare.

5. **Ogiltig sortering ligger kvar i URL:en.** Byter du från Studieplatser till Service med `sort=seats_desc` faller visningen tillbaka till Standard, men `?sort=seats_desc` ligger kvar och slår på igen när du byter tillbaka. Samma sak med `free_now` utanför öppettider.

6. **Chipet "Visa bara lediga just nu" visas utanför öppettiderna.** Kryssrutan är gömd men ett tidigare satt `free=1` (t.ex. delad länk) visar fortfarande chipet fast filtret ignoreras.

7. **`hasActiveFilter` ignorerar `groupSize`, `freeOnly` och vald kategori**, vilket kan ge "56 lokaler" i stället för "X av Y matchar" i vissa lägen.

### Förbättringsförslag (valfria)

- **Sortering på antal platser** använder bara `capacity`, trots att korten nu visar tre platstyper (studieplatser, nedslagsplatser, datorplatser). Alternativ: sortera på summan, eller döp om till "Antal studieplatser".
- **Våningsplan** utan siffra hamnar sist i båda riktningarna — rimligt, men värt att bekräfta.
- **`sort=free_now`** rankar bara ledig/preliminär/upptagen; inom varje grupp behålls manuell ordning (stabil sortering) — OK.

## Vad jag föreslår att vi bygger

**Steg 1 – Rätta träffräkningen i förslagen**
`useNarrowestFilter` tar emot redan kategorifiltrerade lokaler, och `freeOnly` blir en riktig dimension som räknas mot tillgänglighetsdatan.

**Steg 2 – Rätta mobilens "Visa resultat"**
Respektera öppettider i `draftCount` och hämta tillgänglighetsdata även när utkastet (inte bara det tillämpade filtret) kräver den.

**Steg 3 – Språkmedveten sök och namnsortering**
`matchesSpace` matchar även `name_en`; namnsorteringen använder visningsnamnet för aktivt språk med svensk kollation som idag.

**Steg 4 – Städa sorterings-URL och chips**
Nollställ `sort` i URL:en när den blir ogiltig (kategoribyte, stängt), dölj `freeOnly`-chipet utanför öppettider och inkludera `groupSize`/`freeOnly` i `hasActiveFilter`.

**Steg 5 – Uppdatera `docs/url-schema.md`** så beskrivningen av `q` och `sort` stämmer.

Inga databasändringar behövs. Steg 1–5 rör bara frontendlogik och texter.

### Frågor innan bygge
- Ska "Antal platser"-sorteringen räkna alla tre platstyperna tillsammans, eller ska vi bara byta etikett till "Antal studieplatser"? Jag tar det som ett separat steg om du vill.
