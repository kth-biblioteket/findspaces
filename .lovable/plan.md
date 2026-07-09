## Mål
Ge användaren möjlighet att sortera resultatlistan utöver dagens manuella ordning.

## Sorteringsalternativ i dropdown
1. **Rekommenderad** (default) – nuvarande `sort_order` + namn, oförändrat.
2. **Våning (senaste val överst)** – om användaren tidigare valt en våning (sparas i `localStorage`), sortera lokaler på den våningen först, resten efter våningsnummer stigande.
3. **Antal platser (flest först)** – sortera på `seats` fallande, null sist.
4. **Lediga just nu** – *visas endast när aktiv lokaltyp = grupprum*. Sorterar på beläggning stigande (lediga överst) baserat på befintlig `useOccupancy`-data; lokaler utan data hamnar sist.

Alternativ 4 döljs helt (inte bara disable) när annan lokaltyp är vald, så menyn förblir ren.

## Placering & UX
- **Dropdown** (shadcn `Select`) placerad ovanför resultatlistan, till höger på samma rad som "X lokaler hittades"-räknaren. På mobil hamnar den på egen rad under räknaren.
- Label: "Sortera:" följt av select. Ikon: `ArrowUpDown` från lucide.
- Valt värde persisteras i URL som `sort=` via TanStack search params (`fallback` + default `"recommended"`), så länkar kan delas och sortering överlever navigation.
- När användaren växlar lokaltyp bort från grupprum och `sort=free` är aktivt återställs till `recommended` automatiskt.

## Teknisk översikt
- `src/routes/index.tsx`:
  - Utöka `searchSchema` med `sort: fallback(z.string(), "recommended").default("recommended")`.
  - Efter befintlig filtrering – applicera sortering på arrayen innan render.
  - "Senaste våning" läses från `localStorage` i `useEffect` (undvik SSR-mismatch, använd `useHydrated`-mönstret) och sätts när användaren klickar på ett våningsfilter.
  - Beläggningsvärdet finns redan via `useOccupancy` per kort – lyft upp till listnivå för sortering (en enda batch-query eller map).
- Ny liten komponent `SortSelect` i samma fil eller `src/components/SortSelect.tsx`.
- i18n-strängar läggs i `sv.json` / `en.json` (`sort.recommended`, `sort.floor`, `sort.seats`, `sort.free_now`, `sort.label`).

## Utanför scope
- Sortering på datorplatser, nyast tillagd, alfabetiskt – kan läggas till senare.
- Ändringar i admin.
