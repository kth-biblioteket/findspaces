## Mål
Göra lokalkorten i adminläget snabbare att skanna, tryggare att arbeta i och skalbara när listan växer. Ändringarna sker enbart i `src/routes/admin.tsx` (komponenten `SortableSpaceRow` och listcontainern i `TabsContent value="spaces"`).

## Ändringar

### 1. Miniatyrbild + tydligare rubrik
- Lägg till en 64×64 px thumbnail till vänster i `SortableSpaceRow`, mellan drag-railen och huvudinnehållet.
  - Källa: första bilden i `space.images` (fallback `space.image_url`); om ingen bild finns visas en neutral platshållare med `ImageOff`-ikon och texten "Ingen bild".
  - Rundade hörn (`rounded-lg`), `object-cover`, `bg-muted`, `aria-hidden`.
- Rubriken (`space.name`) höjs från `text-base` till `text-lg font-semibold` och tillåts brytas på två rader i stället för `truncate`, så långa namn syns helt.
- Under rubriken visas en meta-rad med `space_kind`-chip + plats (`Plan X · Ligger i …`) i samma flöde. Slug och taggar flyttas ned som en separat, mer diskret rad så rubrikraden andas.

### 2. Klick på hela kortet öppnar redigering
- Byt ut yttre `<li>` mot en struktur där själva innehållsytan är en `<button type="button" onClick={onEdit}>` (eller `role="button"` på en div med `onKeyDown` för Enter/Space) som sträcker sig över kortets klickbara område.
- Interaktiva delar som INTE ska trigga redigering får `onClick={(e) => e.stopPropagation()}`:
  - Drag-handle
  - Markera-checkbox
  - Åtgärdsknappar (dölj/visa, radera)
- Pennikonen tas bort — hela kortet är nu editeringsytan. Hover-state: subtil `bg-accent/40` + `border-primary/40` för att signalera klickbarhet.
- `aria-label` på ytterknappen: `Redigera {space.name}`. Fokusring på hela kortet.

### 3. Sök + filter + kompakt läge
Ovanför listan, i samma verktygsrad som "Markera alla":
- **Sökfält** (`Input` med `Search`-ikon): matchar case-insensitive på `name`, `name_en`, `slug`, `floor`, `located_in`.
- **Filter typ**: liten segmented control / `Select` med värden `Alla / Studieplats / Service / Skapande` (drivs av `space_kind`-kategorins seed-optioner så nya typer plockas upp automatiskt).
- **Filter synlighet**: toggle-grupp `Alla / Synliga / Dolda`.
- **Kompakt-läge**: en switch/toggle "Kompakt vy". I kompakt vy:
  - Thumbnail krymper till 40×40.
  - Meta-rader (typ-chips, ljud-chips, `ContentBadges`) döljs.
  - Padding minskar (`p-2` istället för `p-3 sm:p-4`).
  - Endast rubrik + plats + åtgärder syns → ca dubbelt så många kort per skärm.
- Val persisteras i `localStorage` under nycklarna `admin.spaces.query`, `admin.spaces.kind`, `admin.spaces.visibility`, `admin.spaces.compact` så inställningarna följer med mellan besök.
- Filtreringen sker klient­sidigt över det befintliga `spaces`-arrayet innan `SortableContext` renderas. Räknaren i rubriken uppdateras till `"{visade} av {totalt} lokaler/ytor"`.
- När sökning/filter är aktivt inaktiveras drag-omordning (visuellt genom att dölja drag-handle och en informationsrad "Rensa filter för att sortera om"), eftersom `sort_order` gäller hela listan och inte det filtrerade urvalet.

## Bevaras oförändrat
- Databasstruktur, API-anrop, RLS.
- Mass­urvals-verktygsraden, `SelectByLokaltyp`, redigeringsdialogen.
- Logik för dölj-innan-radera och toast-meddelanden.
- Studentvyn (`src/routes/index.tsx`) — inga ändringar där.

## Teknisk kort­fakta
- Ny `useMemo` som beräknar `filteredSpaces` från `spaces` + söksträng + typ + synlighet.
- Ny liten hook `useLocalStorageState` (eller inline `useState` + `useEffect`) för de fyra persisterade UI-inställningarna.
- Thumbnail återanvänder `resolveImageUrl` från `src/lib/imageUrl.ts` om det behövs; annars raka publika URL:er.
- Tangentbord: Enter/Space på kortet öppnar redigering; Tab-ordningen blir drag → checkbox → kort → dölj → radera.