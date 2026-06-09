# Mål
Visa "Ledigt nu / Upptaget nu" på grupprumskort baserat på
`https://api.lib.kth.se/bookingsystem/v1/roomsavailability/grouprooms/1/1/{timestamp}`.
Statusen ska se ut och bete sig som realtidsbeläggningen (samma plats i
kortheadern, samma schemastyrning från admin).

## API i korthet
Returnerar en lista av rum:
```json
{ "room_number": "4", "room_name": "4", "disabled": 0,
  "availability": true, "status": "free" }
```
- `availability: true` → ledigt nu
- `availability: false` (status `confirmed`/`tentative`) → upptaget
- `disabled: 1` → ingen indikator (rummet är avstängt)

URL:ens `/1/1/` hårdkodas just nu. Lämnas som konstant i serverfunktionen
med en TODO-kommentar så det är lätt att byta till per-lokal-fält senare.

## Databas
Migration: lägg till kolumn på `spaces`:
- `booking_room_number int null` – om satt slås rummet upp mot API:t
  (room_number som sträng). Tomt = ingen indikator.

Ingen ändring av RLS/grants behövs (kolumn på befintlig tabell).

Uppdatera `src/lib/spaces.ts` så fältet följer med, och adminformuläret
(`src/routes/admin.tsx`) får ett nytt fält i grupprumsavsnittet med
hjälptext: "Rumsnummer i bokningssystemet (1–21). Tomt = ingen
status visas."

## Server function
Skapa `src/lib/groupRoomAvailability.functions.ts` med
`getGroupRoomAvailability()`:
1. Hämtar `…/grouprooms/1/1/{Math.floor(Date.now()/1000)}` serverside.
2. Returnerar `{ rooms: Record<string, { available: boolean; disabled: boolean }>, lastUpdated, error? }`
   där nyckeln är `room_number`.
3. `Cache-Control: public, max-age=20` (samma som occupancy).
4. Fel → `{ rooms: {}, error }` så UI tyst döljer indikatorn.

## Klient-hook
Ny `src/lib/useGroupRoomAvailability.ts`:
- TanStack Query, `queryKey: ["group-room-availability"]`,
  `refetchInterval: 60_000`, `staleTime: 30_000` – en global fetch.
- Exporterar `useGroupRoomAvailability(roomNumber)` som returnerar
  `{ status: "free" | "busy" } | null`. `null` om:
  - inget `roomNumber` är satt,
  - rummet saknas i svaret,
  - `disabled === 1`,
  - API-fel.

## Schema-gating
Återanvänd `useOccupancySettings` + `isWithinSchedule` exakt som för
realtidsbeläggningen – samma schema styr när badgen visas, så
ingen ny admin-vy behövs.

## UI i `SpaceCard`
I header-blocket, direkt under (eller istället för) `OccupancyBadge`:
- Om `booking_room_number` är satt och hooken returnerar status:
  rendera en `GroupRoomBadge` med samma typografi/ikon som
  `OccupancyBadge`:
  - ikon: `DoorOpen` (lucide),
  - text: **"Just nu:"** + `t("group_room.free" | "group_room.busy")`,
  - färgindikator (liten prick eller block) grön/röd.
- Visas bara om `occupancyVisible` (samma schema-villkor).
- Påverkar inte realtidsbeläggningen – bägge kan visas samtidigt om
  ett grupprum mot förmodan också har sensor.

## i18n
Lägg till nycklar i `src/i18n/locales/sv.json` och `en.json`:
- `group_room.free`: "Ledigt nu" / "Free now"
- `group_room.busy`: "Upptaget" / "Booked"
- `group_room.right_now`: "Just nu" / "Right now"

## Filer som skapas/ändras
- **Migration:** lägg till `spaces.booking_room_number`
- **Skapas:** `src/lib/groupRoomAvailability.functions.ts`
- **Skapas:** `src/lib/useGroupRoomAvailability.ts`
- **Uppdateras:** `src/lib/spaces.ts` (typ + select)
- **Uppdateras:** `src/components/SpaceCard.tsx` (ny badge)
- **Uppdateras:** `src/routes/admin.tsx` (nytt fält + hjälptext)
- **Uppdateras:** `src/i18n/locales/{sv,en}.json`

Inga nya secrets, ingen ändring av RLS, inga edge functions.
