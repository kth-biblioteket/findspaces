# Bättre gruppering & gridsystem inne på lokalkortet

## Mål
Skapa tydligare visuell rytm genom att gruppera kortets innehåll i fyra block med samma vertikala avstånd mellan blocken, och ge filterchipsen lite mer luft internt.

## De fyra grupperna
1. **Identitet** – rubrik, våningsplan + lokaltyp, antal platser
2. **Status** – beläggning (Just nu:) eller grupprumsstatus (Ledigt/Upptaget)
3. **Filterchips** – intent + kategori-chips
4. **Knappar** – Se på karta, Se schema, Boka grupprum

(Notice- och info-rutorna är egna block som ligger ovanför grupp 1 enligt nuvarande layout-ordning.)

## Förändringar i `src/components/SpaceCard.tsx`

### 1. Ersätt ad-hoc-marginaler med ett konsekvent gridsystem
Idag använder `renderSection` `mt-3 md:mt-4` som radspecifik marginal, och statusbadgar/knappar har egna marginaler. Det ger ojämna avstånd.

**Lösning:** Använd en `flex flex-col` på kortets innehållscontainer med `gap-4 md:gap-5` som enda källa till vertikalt avstånd mellan grupperna. Inom varje grupp används ett mindre internt avstånd (`gap-1.5` för identitet, `gap-2` för status).

Konkret:
- Wrappa identitet (rubrik + meta-raden + antal platser) i en `<div className="flex flex-col gap-1">` så de tre raderna hänger ihop tätt.
- Wrappa status (occupancy + group room badge) i en `<div className="flex flex-col gap-2">` (eller döljs helt om inga finns).
- Filterchips förblir en grupp, men `mb-2 md:mb-3` tas bort (gap hanteras av föräldern).
- Knappraden ärver samma gap.
- `renderSection` slutar lägga på `mt-3 md:mt-4` – istället returnerar varje sektion ett naket block och kortets yttre `flex flex-col gap-4 md:gap-5` styr avståndet.

### 2. Tokens för avstånd
Lägg in en lokal konstant högst i komponenten:
```
const GROUP_GAP = "gap-4 md:gap-5";       // mellan de fyra grupperna
const INNER_TIGHT = "gap-1";              // inom identitetsblocket
const INNER_LOOSE = "gap-2";              // inom statusblocket
```
Detta gör spacing-systemet explicit och lätt att justera framöver.

### 3. Lite mer padding i filterchipsen
Nuvarande `chipBase`:
```
inline-flex items-center gap-1.5 text-xs rounded-md px-2 py-1 ...
```
Höjs till:
```
inline-flex items-center gap-1.5 text-xs rounded-md px-2.5 py-1.5 ...
```
(samma chip-stil används av både intent- och kategorichips, så bara en plats att ändra).

Avståndet mellan chips (`gap-2`) behålls.

### 4. Mindre städning
- Ta bort den dubbla marginalen `mb-2 md:mb-3` på chips-blocket.
- Säkerställ att tomma grupper (t.ex. inga chips, ingen status) inte lämnar kvar ett tomt gap – returnera `null` så att flex-gap inte räknar in dem.

## Det här ändrar inte
- Layout-ordningen från admin (`useCardLayout`) respekteras fortfarande.
- Bildens kolumn (2fr/3fr på desktop) och kortets ytterpadding (`md:p-6`) rörs inte.
- Färger, typografi, ikonstorlekar är oförändrade.
- Notice- och info-rutornas utseende (gul varning / grå info) är oförändrat – de blir bara en del av samma gap-rytm.

## Resultat
Fyra tydliga block med samma andningsutrymme mellan sig, tätare inom varje block, och filterchips som känns lite mindre hopträngda.
