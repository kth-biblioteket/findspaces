## Problem

I studentvyn är sektionen **"Jag vill arbeta"** hårdkodad i `FilterPanel.tsx` till exakt tre alternativ — **Enskilt**, **Tillsammans**, **I grupprum** — plus en undermeny **Gruppstorlek** (2–4 / 5+) som visas när "I grupprum" är vald.

I adminläget under **Filter**-fliken visas däremot kategorin `intent` ("Jag vill arbeta") som en helt vanlig redigerbar kategori. Databasen innehåller där bara två stale alternativ ("Enskilt", "I grupp") som inte alls används av studentvyn — admin tror alltså att man kan ändra dessa, men ändringar får ingen effekt. Det är detta som inte stämmer.

I lokal-redigeringsformuläret är detta redan korrekt löst: raden `categories.filter((c) => c.key !== "intent")` döljer kategorin, och en hårdkodad checkbox-grupp med de tre rätta alternativen används istället (admin.tsx rad 443–460). Samma logik saknas i `FiltersTab`.

## Åtgärd

**1. `src/routes/admin.tsx` — `FiltersTab`:**
- Filtrera bort `intent`-kategorin ur listan som mappas i `categories.map(...)` (rad ~787).
- Lägg in ett litet låst infokort överst som visar:
  - Titeln "Jag vill arbeta" (systemstyrd)
  - De tre fasta valen: Enskilt · Tillsammans · I grupprum
  - Undertexten: Gruppstorlek (2–4, 5+) visas automatiskt när "I grupprum" är vald
  - Kort förklaring: "Dessa val är inbyggda i studentvyn och kan inte redigeras här. Använd lokal-redigeraren för att markera vilka arbetssätt varje lokal passar för."
- Drag-and-drop-ordningen (`handleDragEnd`) bör fortfarande fungera för övriga kategorier; `intent` ingår inte i den sorterbara listan.

**2. Ingen DB-städning** av de stale `filter_options`-raderna för `intent` ("Enskilt", "I grupp") — de används inte längre någonstans i koden, så de gör ingen skada. Säg till om du vill att jag rensar dem också.

## Andra liknande fel som kontrollerats

- **Lokal-formuläret (admin)**: ✅ redan korrekt, använder hårdkodade tre val.
- **`lokaltyp`-kategorin**: ✅ innehåller "Grupprum" som studentvyn använder för workMode-matchning.
- **Gruppstorlek (2–4 / 5+)**: hårdkodad bara i studentvyn, finns inte alls i admin — vilket är rimligt eftersom den är direkt knuten till `capacity`-fältet på lokalen. Ingen åtgärd.
- **Kortlayout-fliken**: använder `CARD_SECTION_KEYS` (inte filter_categories), så ingen mismatch där.
- **Texter-fliken**: använder fasta nycklar i `useUiText`, ingen mismatch.

## Tekniska detaljer

Filer som ändras:
- `src/routes/admin.tsx` — `FiltersTab`-komponenten (rad ~746–797).

Inga DB-migrations, inga typändringar, inga ändringar i studentvyn.
