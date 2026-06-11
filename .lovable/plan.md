## Vad vi gör

Idag används samma fält (`group_booking_url` / `_en`) för både den permanenta "Boka grupprum"-knappen och den tillfälliga "Boka nu"-knappen som visas när grupprummet är ledigt. Vi separerar dessa till två oberoende länkfält och låter "Boka nu" stödja platshållare som ersätts dynamiskt med rumsnummer och aktuell tid.

## Ändringar

### 1. Databas (migration)
Lägg till två kolumner på `public.spaces`:
- `book_now_url` text
- `book_now_url_en` text

(Inga nya policies/grants behövs – täcks av befintliga policies på `spaces`.)

### 2. Typer
- `src/lib/spaces.ts`: lägg till `book_now_url` och `book_now_url_en` i `Space`-typen.
- `src/integrations/supabase/types.ts` regenereras automatiskt efter migrationen.

### 3. Adminformulär (`src/routes/admin.tsx`)
Lägg till två nya fält precis under befintliga group_booking_url-fälten:
- "Länk till Boka nu (ledigt grupprum) – SV (book_now_url)"
- "Link to Book now (free group room) – EN (book_now_url_en)"

Med hjälptext som förklarar platshållarna:
`{room}`, `{year}`, `{month}`, `{day}`, `{hour}`, `{minute}`

Exempelplaceholder:
`https://apps.lib.kth.se/mrbsgrupprum/edit_entry.php?area=1&room={room}&hour={hour}&minute=0&year={year}&month={month}&day={day}`

Spara värdena i samma `upsert` som övriga fält i `save`-flödet.

### 4. Kortet (`src/components/SpaceCard.tsx`)
- Behåll `localizedGroupBookingUrl` som idag för den permanenta "Boka grupprum"-knappen (button_group_booking).
- Beräkna en ny `bookNowUrl`:
  1. Välj rätt mall: `book_now_url_en` om språket är `en` och fältet är ifyllt, annars `book_now_url`.
  2. Om mallen är tom → ingen "Boka nu"-knapp visas (även när grupprum är ledigt).
  3. Annars ersätt platshållare:
     - `{room}` → `space.booking_room_number`
     - `{year}` → `now.getFullYear()`
     - `{month}` → `now.getMonth() + 1` (utan zero-pad)
     - `{day}` → `now.getDate()`
     - `{hour}` → `now.getHours()` (aktuell timme)
     - `{minute}` → `0`
- Skicka denna URL till `GroupRoomBadge` istället för `localizedGroupBookingUrl`.

### 5. Översättningar
Inga nya nycklar krävs – "Boka nu"/"Book now" finns redan (`card.book_now`).

## Tekniska detaljer

- Tidsberäkning sker på klient (i `SpaceCard`) vid render. Det räcker eftersom knappen ändå bara visas när grupprummet är ledigt enligt schemat – ingen risk för stale SSR-länk eftersom URL:en byggs i komponenten.
- `booking_room_number` finns redan; om det saknas men mallen är ifylld byts `{room}` mot tom sträng. Vi visar då ändå knappen (admin har valt att göra så) – alternativt kan vi gömma knappen om `{room}` används men nummer saknas. Standardval: dölj knappen om mallen innehåller `{room}` men `booking_room_number` är null.
- Den permanenta "Boka grupprum"-knappen (`button_group_booking`) påverkas inte och fortsätter att använda `group_booking_url` / `_en` rakt av.

## Vad som INTE ändras

- Befintliga `group_booking_url` / `group_booking_url_en` behålls oförändrade och fortsätter driva den permanenta "Boka grupprum"-knappen.
- Tidsfönster/schema för när grupprumsstatus visas är samma som idag.
- Inga ändringar i `useGroupRoomAvailability` eller serverfunktioner.
