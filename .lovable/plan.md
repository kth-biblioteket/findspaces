## Mål

1. När ett grupprum har status **Ledigt** ska användaren kunna boka direkt från statusraden ("Just nu: Ledigt").
2. När man valt arbetsläget **I grupprum** ska man kunna filtrera fram **bara lediga rum just nu**.

## Min rekommendation kring knappdesignen

Idag finns "Boka grupprum"-knappen längst ned på kortet (fyllt blå pill). Om vi lägger till ytterligare en blå pill bredvid statusraden blir det visuellt rörigt — två identiska knappar som leder till samma URL.

**Rekommendation:** byt utseende på den nya knappen så att den blir en tydlig *handlings-CTA i kontext* och inte konkurrerar med den befintliga.

- Inline-knapp till höger om "Just nu: Ledigt", t.ex. **"Boka nu →"**
  - Stil: kompakt pill, grön accent (matchar den gröna pricken som redan signalerar ledigt), liten storlek (`text-xs`, `py-1`, `px-3`), pil-ikon istället för dörr/kalender.
  - Endast synlig när `groupRoom.status === "free"` (och bokningslänk finns).
- Den befintliga "Boka grupprum"-knappen längst ned **behålls oförändrad** — den fungerar alltid (även när rummet är upptaget, för att boka annan tid) och är den generella ingången.

Resultat: statusraden får en omedelbar genväg när det är meningsfullt; bottenknappen förblir den stabila, alltid-tillgängliga åtgärden. Olika färg + placering + ordval ("Boka nu" vs "Boka grupprum") gör att det inte uppfattas som dubblerat.

## Filter för "lediga just nu"

Ja, det är en bra idé och passar väl in i flödet: när användaren valt **I grupprum** dyker ett extra val upp (på samma sätt som gruppstorlek gör idag).

- Plats: i `FilterPanel`, direkt under gruppstorlek, endast synligt när `workMode === "grupprum"`.
- UI: en enkel toggle/kryssruta: **"Visa bara lediga just nu"**.
- Beteende: filtrerar bort grupprum vars live-status inte är `free` (alltså `busy` och `tentative` döljs). Rum utan känd status (disabled eller saknar `booking_room_number`) döljs också när toggeln är på.
- URL-state: nytt sökparametervärde `free=1` som bara används när `mode=grupprum`.
- Persistens: avmarkeras automatiskt om användaren byter bort från grupprum-läget (samma mönster som `groupSize`).

Eftersom datat redan hämtas via `useGroupRoomAvailability` (cache i React Query, uppdateras varje minut) får filtret samma färska data som badgen — inga extra anrop.

## Tekniska detaljer

**SpaceCard.tsx**
- I `GroupRoomBadge`, lägg till en valfri `bookingUrl`-prop.
- När `status === "free"` och url finns: rendera inline-länk `Boka nu →` (grön outline-pill, t.ex. `border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-full px-3 py-1 text-xs font-semibold`).
- I `renderSection` ("header") skickar vi `localizedGroupBookingUrl` (eller `space.booking_url` om det är det som används för grupprum — kontrolleras vid implementation) till `GroupRoomBadge`.

**Filters / URL**
- `Filters`-typen i `FilterPanel.tsx`: lägg till `freeOnly: boolean`.
- `emptyFilters`: `freeOnly: false`.
- `validateSearch` + `filtersToSearch` + `searchToFilters` i `routes/index.tsx`: hantera `free` (boolean) bara när `mode === "grupprum"`; nollställs annars.
- `FilterPanel`: rendera en checkbox/toggle under gruppstorleks-sektionen när `workMode === "grupprum"`.

**Filtrering**
- `matchesSpace` i `lib/filterMatch.ts` får ingen ny logik för `freeOnly` (den har inte tillgång till live-data).
- Istället filtreras `filtered`-listan i `routes/index.tsx` i ett extra steg: när `filters.freeOnly && filters.workMode === "grupprum"`, hämta availability via samma query och behåll bara rum där `rooms[String(space.booking_room_number)]?.status === "free"` och `disabled !== true`.
- Detta gör att laddningstillstånd hanteras pent: medan availability laddar visar vi alla matchande rum (eller en liten "uppdaterar…"-indikator — avgörs i implementation).

**ActiveFilterChips**
- Lägg till en chip "Lediga just nu" som kan tas bort, för konsekvens med övriga filter.

**i18n**
- Nya nycklar (sv/en):
  - `card.book_now` ("Boka nu" / "Book now")
  - `filters.free_only` ("Lediga just nu" / "Free right now")
  - `chips.free_only` (för chip-label)

## Vad som inte ändras

- Layout-systemet (`useCardLayout`) och "Boka grupprum"-bottenknappen — orörda.
- Backend, edge functions, datakällor — orörda.
- Övriga filterkategorier och övrig kortlayout — orörda.

## Frågor till dig innan jag bygger

1. Knappens text: **"Boka nu"** eller hellre **"Boka detta rum"** / **"Boka direkt"**?
2. Filter-toggeln: vill du ha den som en **kryssruta** (matchar nuvarande filterstil) eller en **pill-toggle** likt arbetsläges-valen?
3. Ska filtret kallas **"Lediga just nu"** eller **"Bara lediga rum"**?
