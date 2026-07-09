## Mål
Lägg till skrivarrum, förvaringsskåp och makerspace i appen som **service-lokaler** i en egen intent-flik – utan att förorena studieplatsflödet.

## Datamodell
Servicelokaler bor i samma `spaces`-tabell (all admin, bilder, översättningar, kortlayout återanvänds). En ny kolumn skiljer dem åt.

- **Migration**: `ALTER TABLE public.spaces ADD COLUMN space_kind text NOT NULL DEFAULT 'study'` (värden: `'study'` | `'service'`).
- Ingen ny tabell, inga nya RLS-policys, inga nya buckets.
- Övriga fält återanvänds: `image_url`/`images`, `description`/`description_en`, `map_url`/`map_url_en`, `book_now_url`/`book_now_url_en` (för extern länk), `floor`, `located_in`, `notice`, `info`.
- **Service-underkategori** (skrivare / skåp / makerspace) hanteras via befintliga `lokaltyp`-arrayen så admin kan lägga till fler typer utan schemabyte.

## Frontend – intent-flik
Filterpanelen får ett tredje läge vid sidan om "Enskilt / Tillsammans / Grupprum":

```text
[ Jag vill arbeta ]   [ Hitta service ]
```

- Ny URL-param `mode=service` (search param, samma mönster som `mode=grupprum`).
- När `mode=service` är aktivt:
  - Listan filtreras till `space_kind = 'service'` (studieplatser döljs helt).
  - Filterpanelen visar bara: fritextsök, `lokaltyp` (Skrivare/Skåp/Makerspace) och `vaningsplan`. Ljudnivå/utrustning/grupprum-storlek/"lediga just nu" göms.
  - Rubriken byts från "Studieplatser" till "Service & faciliteter".
- När `mode` INTE är `service`: listan filtreras till `space_kind = 'study'` (dagens beteende bevaras exakt).

## Kort-anpassning
Servicekort använder samma `SpaceCard` men med avstängda block som inte är relevanta:

- Ingen `OccupancyBadge`, ingen `GroupRoomBadge`, ingen kapacitets-/platser-rad.
- "Se schema" och "Boka grupprum" göms.
- "Boka nu" återanvänds som generisk **extern länk** (etikett byts till t.ex. "Mer info" / "Boka" beroende på om URL finns – enklaste lösningen: behåll "Boka nu" när `book_now_url` är satt, annars visa ingen knapp).
- "Visa på karta" och "Om lokalen" fungerar som vanligt.

Detta görs med en enkel `if (space.space_kind === 'service')`-gren i `SpaceCard` – ingen ny komponent behövs.

## Admin
- I redigeringsformuläret läggs en **radiogrupp överst**: "Typ av lokal: ○ Studieplats ● Service & faciliteter".
- När "Service" är valt göms fält som inte gäller (ljudnivå, utrustning, kapacitet, grupprumsbokning, beläggningsinställningar, "visa lediga"). Fälten finns kvar i DB men rensas inte automatiskt – enklare och reversibelt.
- I översiktstabellen (Lokaler-fliken) läggs en liten **typ-badge** i namnkolumnen ("Studieplats" / "Service") så det syns direkt vilken sort som är vilken. Sorteringen och drag-drop-ordningen är gemensam (räcker för 4 servicelokaler).

## Filter-alternativ (seed via admin, inte migration)
Efter migrationen lägger du själv till tre `lokaltyp`-alternativ i admin: "Skrivare", "Förvaringsskåp", "Makerspace". Inget kodstöd behövs – filter_options-tabellen hanterar det redan.

## i18n
Nya strängar i `sv.json`/`en.json`:
- `filters.intent_service` = "Hitta service" / "Find services"
- `results.heading_service` = "Service & faciliteter" / "Services & facilities"
- `admin.space_kind_label`, `admin.space_kind_study`, `admin.space_kind_service`

## Vad som INTE ändras
- Ingen påverkan på befintlig studieplats-URL, filter, E2E-test, analytics-events eller SEO.
- Ingen ny tabell, ingen ny bucket, inga nya RLS/GRANT-ändringar.
- Beläggnings-/grupprumshooks lämnas orörda – de anropas bara för studieplatser.

## Leveransordning
1. Migration (`space_kind`-kolumn).
2. Typuppdatering i `src/lib/spaces.ts` + fetch-query.
3. Filterpanel: ny intent-knapp + `mode=service` i search params.
4. `SpaceCard`-gren för servicekort.
5. Admin: radioknapp + villkorlig fältdöljning + typ-badge i tabellen.
6. i18n-strängar.
7. Uppdatera E2E-test med ett kort case: växla till "Hitta service", verifiera att listan filtreras.
