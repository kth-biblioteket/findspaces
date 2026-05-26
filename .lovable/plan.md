# Mål

1. Ta bort fliken **Inställningar**. Flytta kategoritrubrikernas redigering in i fliken **Filteralternativ**.
2. Låt admin **skapa helt nya filterkategorier** (utöver de fem befintliga).
3. Låt admin **ändra ordningen** på filterkategorierna i studentvyns sidopanel via drag-and-drop.

# Databasändringar

- Ny tabell `filter_categories`:
  - `id` (uuid, PK)
  - `key` (text, unique) — t.ex. `intent`, `noise`, `lokaltyp` eller en ny `atmosfar`
  - `title` (text) — visningsnamn i sidopanelen
  - `style` (text) — `"list"` (som "Jag vill arbeta") eller `"pills"` (övriga)
  - `match_mode` (text) — `"any"` eller `"all"` (matchar dagens skillnad mellan intent/lokaltyp vs equipment/facilities)
  - `is_single_select` (boolean) — true för "Ljudnivå" (en text-kolumn idag)
  - `sort_order` (int)
- Seeda raderna för de fem nuvarande kategorierna med rätt key/style/match_mode/sort_order.
- Ny kolumn `spaces.tags jsonb default '{}'::jsonb` — lagrar val för **nya** kategorier som `{ "atmosfar": ["Mysigt"] }`.
- Befintliga typade kolumner (`intent`, `noise`, `equipment`, `facilities`, `lokaltyp`) behålls oförändrade så att seed-data och RLS-policys inte påverkas.

`filter_options.category` fortsätter peka på `filter_categories.key` (textmatchning).

# Adminändringar (`src/routes/admin.tsx`)

- Ta bort `<Tabs>` runt Lokaler/Filteralternativ/Inställningar, eller minska till två flikar **Lokaler** + **Filteralternativ**.
- Filteralternativ-fliken:
  - Lista kategorier sorterade efter `sort_order`, med drag-handtag (dnd-kit) för omordning.
  - Inline-redigering av `title` per kategori.
  - Knapp "Lägg till kategori" → modal som frågar efter `title`, `style`, `match_mode`, `is_single_select`. `key` genereras (slugifierad lowercase utan diakritiska tecken).
  - Knapp "Ta bort kategori" — endast för kategorier som inte är "låsta" (de fem ursprungliga märks `locked: true` så vi inte tappar data i typade kolumner).
  - Under varje kategori: dagens lista med filteralternativ + drag/lägg till/ikon (oförändrad).
- Ta bort `useCategoryTitles`/`useSaveCategoryTitles`-användning i admin och ersätt med direkt CRUD mot `filter_categories`.
- I lokalformuläret: rendera ett block per kategori dynamiskt från `filter_categories`. För de fem låsta kategorierna skriv till sina respektive kolumner som idag; för nya kategorier skriv till `spaces.tags[key]`.

# Studentvy (`src/components/FilterPanel.tsx`, `src/routes/index.tsx`)

- Hämta `filter_categories` (sorterad) och rendera grupperna dynamiskt i den ordningen, med rätt stil (`list` med check-ikon eller `pills`).
- `Filters`-typen blir `{ query: string; byCategory: Record<string, string[]> }`.
- Filtreringslogiken i `index.tsx` läser `match_mode`/`is_single_select` från kategorin och kontrollerar antingen typad kolumn (för låsta keys) eller `space.tags[key]`.

# Borttagning

- Ta bort `src/lib/useSettings.ts` och `app_settings`-referenser i UI. Tabellen i databasen lämnas tom utan att tas bort (för att inte påverka andra eventuella användare av nyckeln).

# Steg

1. Migration: skapa `filter_categories`, seeda fem rader, lägg till `spaces.tags`.
2. Uppdatera `src/lib/spaces.ts` (typer + helper för att kombinera typade kolumner och `tags`).
3. Ny hook `useFilterCategories` (CRUD + reorder).
4. Skriv om FilterPanel + filtreringslogik i index.tsx.
5. Skriv om Admin: ta bort Inställningar-fliken, bygg ny Filteralternativ-vy med kategorihantering, gör lokalformuläret dynamiskt.
6. Verifiera att de fem ursprungliga kategorierna fortfarande fungerar och att en nyskapad kategori går att filtrera på.
