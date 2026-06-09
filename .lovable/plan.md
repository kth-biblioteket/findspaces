## Mål
Ersätt den slumpade demobeläggningen med riktiga värden från KTH:s API
`https://apps.lib.kth.se/smartsigntools/api/v1/imas/realtime`, och låt admin-schemat
(inte API:ets `hours`) styra när indikatorn visas.

## Hur API:t ser ut
Svaret innehåller en lista `data.zones` där varje zon har:
- `name` – t.ex. "Newton", "Ångdomen", "Södra Galleriet"
- `inside` – aktuellt antal personer
- `threshold` – maxantal (satt i Countmatters)

Mappning till våra lokaler sker via fältet `countmatters_sensor_id` som
redan finns på varje lokal i adminläget. Värdet ska vara **zonens namn**
exakt som det står i API:t (t.ex. `Newton`). Lokaler vars ID inte matchar
någon zon visar ingen indikator – så när KTH lägger till/tar bort räknare
räcker det att uppdatera ID:t i adminläget.

## Datakälla (server function)
Skapa `src/lib/occupancy.functions.ts` med en `createServerFn` `getRealtimeOccupancy()` som:
1. Hämtar API:t serverside (undviker CORS, kan cacha kort).
2. Returnerar en map `{ [zoneName]: { inside, threshold } }` + `lastUpdated`.
3. Vid fel: returnerar `{ zones: {}, error }` så UI:t bara döljer indikatorn.

Sätt `Cache-Control` på server-response (~20 s) för att skona API:t när
många kort renderas.

## Klient-hook (ersätter dagens placeholder)
Skriv om `src/lib/useOccupancy.ts` så den:
- Använder TanStack Query (`queryKey: ["occupancy-realtime"]`,
  `refetchInterval: 60_000`, `staleTime: 30_000`) som anropar serverfunktionen **en gång** globalt.
- Exponerar `useOccupancy(sensorId)` som slår upp `sensorId` i den hämtade
  zon-mappen och räknar ut:
  - `ratio = inside / threshold` (om `threshold > 0`)
  - `level`: 1 om `ratio < 0.5`, 2 om `< 0.85`, annars 3
  - `status`: `free | moderate | busy` enligt level
- Om zonen saknas, `threshold` är 0, eller API-fel → returnera `null`
  (kortet visar då ingen indikator).

## Schema-gating (oförändrad logik, ny placering)
`SpaceCard` använder redan `isWithinSchedule(occSettings.schedule, ...)`. Den
behålls — alltså är det adminens veckoschema som styr synlighet, inte
API:ets `hours`-fält (det ignoreras helt).

## UI-justeringar i `SpaceCard` / `OccupancyBadge`
- Ta bort "Demo"-pillet eftersom datan nu är skarp.
- Visa fortfarande textetiketten ("Ledigt/Måttligt/Upptaget").
- (Valfritt, kan utelämnas) liten "uppdaterad för X min sedan"-tooltip.

## Admin
Uppdatera hjälptexten under sensor-ID-fältet: förklara att värdet är
**zonnamnet** från Countmatters (t.ex. `Newton`, `Ångdomen`), och att tomt
fält = ingen indikator visas.

## Filer som ändras / skapas
- **Ny:** `src/lib/occupancy.functions.ts` (serverfunktion mot KTH-API:t)
- **Skrivs om:** `src/lib/useOccupancy.ts` (riktiga värden via React Query)
- **Uppdatera:** `src/components/SpaceCard.tsx` (ta bort Demo-pill)
- **Uppdatera:** `src/routes/admin.tsx` (hjälptext för sensor-ID)

Inga databasändringar och inga nya secrets behövs – API:t är publikt.
