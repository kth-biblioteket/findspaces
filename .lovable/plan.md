
## Mål

Göra de två "Systemstyrda" kategorierna i admin fullt redigerbara — rubrik, alternativens etiketter, ikoner, ordning, samt lägga till/dölja alternativ — utan att bryta studievyns filtrering, i18n eller URL‑parametrar.

## Nuläge (kort)

- **Vad letar du efter?** styrs av kolumnen `spaces.space_kind` med CHECK som tillåter `study | service | creative`. Etiketterna kommer från i18n (`sv.json`), inte databasen. `filter_categories`-raden `intent` (fel namn) finns men filtreras bort både i student‑ och adminvyn.
- **Hur vill du arbeta?** styrs av `spaces.intent text[]` med värdena `enskilt | tillsammans | grupprum`. Etiketter i i18n. Ingen `arbetssatt`‑rad finns alls i `filter_categories`.
- Nyckeltrösklarna (URL‑param `kind`, matchning i `filterMatch.ts`, CHECK‑constraint) använder de engelska nycklarna — inte de svenska etiketterna. Det gör att vi kan flytta etiketter/ikoner/ordning/visning till DB utan att röra logiken.

## Design

Behandla båda som "vanliga" kategorier i `filter_categories` men markera dem som **strukturerade** (special_kind) så koden vet att de är kopplade till `space_kind` respektive `intent`. Varje alternativ får en stabil `value_key` (t.ex. `study`) som matchar det som lagras på `spaces`, plus redigerbar `label` och `icon`.

```text
filter_categories
  key = "space_kind"    special_kind = "space_kind"   title = "Vad letar du efter?"
  key = "arbetssatt"    special_kind = "arbetssatt"   title = "Hur vill du arbeta?"

filter_options (ny kolumn value_key)
  space_kind:  study / service / creative
  arbetssatt:  enskilt / tillsammans / grupprum
```

Etiketter, ikoner, ordning och `hidden` blir redigerbara i admin precis som för övriga kategorier. `value_key` är låst för seedade rader (kopplad till kod/CHECK) men fri för nya rader.

### Full frihet (lägga till/ta bort)

- **arbetssatt** (`intent text[]`): lägga till/ta bort går utan schemaändring — nya `value_key` blir bara nya strängar i arrayen. Admin‑formuläret för en lokal läser alternativen från DB istället för hårdkodad lista.
- **space_kind** (CHECK‑constraint): för att tillåta egna värden byter vi CHECK mot en trigger som validerar mot `filter_options.value_key` där kategorin är `space_kind` och `hidden = false`. Default förblir `study`. URL‑param `kind` blir en fri sträng (fortfarande med `study` som implicit default).
- Seedade rader (`study/service/creative`, `enskilt/tillsammans/grupprum`) är markerade `is_seed = true` och kan **döljas** men inte raderas — annars går befintlig data sönder. Nya rader kan raderas fritt om ingen lokal använder deras `value_key`.

## Implementation

### 1. Schema (migration)

- `ALTER TABLE filter_categories ADD COLUMN special_kind text` (null för vanliga kategorier).
- `ALTER TABLE filter_options ADD COLUMN value_key text`, `ADD COLUMN is_seed boolean DEFAULT false`, `ADD COLUMN hidden boolean DEFAULT false`.
- Ersätt CHECK på `spaces.space_kind` med `BEFORE INSERT/UPDATE`‑trigger som slår upp i `filter_options`.
- Städa bort de två stale `intent`‑raderna, seeda:
  - `filter_categories`: `space_kind` (sort 0) och `arbetssatt` (sort 1), båda `special_kind` satt, `title` satt.
  - `filter_options` för dessa kategorier med `value_key` = kodnyckeln och `label` = nuvarande svenska text från `sv.json`, `is_seed = true`, `default_icon` satt (t.ex. `BookOpen`, `Coffee`, `Palette` / `User`, `Users`, `Users`).

### 2. Studievy (`FilterPanel.tsx`, `ActiveFilterChips.tsx`)

- Ersätt de hårdkodade `intentTabs` och kind‑pillsen med rendering från `useFilterCategories()` för de två `special_kind`‑kategorierna. Fall tillbaka till i18n‑text bara om DB‑raden saknas (skyddsnät).
- Fortsätt använda `value_key` som URL‑param och för matchning — inga ändringar i `filterMatch.ts` eller `index.tsx`.

### 3. Admin

- I `FiltersTab` (`admin.tsx` ~1490–1525): ta bort de två "Systemstyrd"‑informationskorten. Låt `editableCategories` inkludera `space_kind` och `arbetssatt`; markera seedade alternativ med en liten "Standard"‑pill och blockera radering (bara "Dölj"‑toggle) — samma dra‑och‑släpp och ikon‑redigering som redan finns för övriga kategorier.
- I lokal‑redigeraren (`admin.tsx` ~700 och ~872): läs "Typ av lokal"‑valen och "Arbetssätt"‑valen från DB istället för hårdkodade listor.
- Konsolidera de fyra kopiorna av kind‑etiketterna (`kindMeta`, `SelectByLokaltyp`, typväljaren) till en hjälpfunktion som slår upp label + färg från `filter_options`.

### 4. Verifiering

- Kör typecheck.
- Playwright: öppna studievyn, verifiera att kind‑pillsen och arbetssätts‑tabbarna fortfarande syns och filtrerar; öppna admin och byt namn på "Enskilt" → "Solo", bekräfta att studievyns tab uppdateras.

## Öppna frågor

1. **Vad ska hända med i18n?** Idag finns svenska etiketter i `sv.json` för `filters.mode_*` och `filters.intent_*`. Föreslår att DB blir källa och i18n‑nycklarna bara används som fallback. OK?
2. **Radera seedade alternativ helt?** Blockeras idag i planen (kan bara döljas). Om du vill kunna radera helt behöver vi migreringsflöde som nollställer/ersätter värdet på befintliga lokaler först — säg till om det är viktigt.

Vill du att jag kör planen som den är?
