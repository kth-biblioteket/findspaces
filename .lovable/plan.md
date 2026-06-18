## Mål
Justera typografi, färger, knappar och små layoutdetaljer i studentvyn så att den känns som en del av kth.se — utan att röra layout, komponentstruktur eller funktionalitet.

## KTH-referenser (från kth.se/biblioteket)
- **Färger:** djup navy `#000061` (header/rubriker), KTH-blå `#1954a6` (knappar/länkar), varm sand `#F5F5F5` (sektionsbakgrund), vit kortyta. Dessa finns redan som tokens (`--kth-navy`, `--kth-blue`, `--kth-sand`) — vi använder dem mer konsekvent.
- **Form:** raka/lätt rundade hörn (kth.se använder mestadels raka kanter och *pill-formade* primärknappar).
- **Typografi:** KTH använder Figtree (redan satt). Rubriker tunga och navy, brödtext svart.
- **Knappar:** fyllda blå pill-knappar med vit text; sekundära som outline i KTH-blå.
- **Info-/notisbanner:** mjuk gul/sand bakgrund med info-ikon till vänster (samma mönster som "sommaröppettider"-notisen på kth.se).

## Ändringar (endast presentation, inga funktionsändringar)

### 1. Header (`src/routes/index.tsx`)
- Byt header-bakgrund från `bg-card` till **KTH navy** (`--kth-navy`) med vit text — samma intryck som det blå bandet på kth.se.
- Rubriken `header.title` i vit, lite större (`text-base font-semibold`).
- Språkväljare och admin-kugghjul i vit/transparent-vit hover.
- Tunn ljus underkant istället för border.

### 2. Sidbakgrund
- Byt sidans `bg-background` (vit) till **KTH sand** (`--kth-sand`) så att vita kort/filterpanel "lyfter" — samma kontrast som kth.se mellan sand-sektioner och vita innehållskort.

### 3. Filterpanel (aside + mobile sheet)
- Rubriken "Filter" i KTH-navy, något större.
- "Rensa alla" som tydlig länk i KTH-blå med understreck-on-hover (redan nära — finjustera).
- Sektionsrubriker inom panelen i navy, versaler-tracking eller fet kapitel-stil för att matcha kth.se:s sidopanel-mönster.

### 4. Knappar (genomgående)
- Primärknappar (mobile "Visa filter", "Visa N resultat", "Rensa alla filter", "Ta bort filter"): redan pill — säkerställ KTH-blå (`--primary` → `--kth-blue`) och lite tyngre vikt (`font-semibold`).
- Outline-knappar i KTH-blå ram + KTH-blå text.

### 5. Lokalkort (`src/components/SpaceCard.tsx`) — lätt polish
- Korttitel i **KTH-navy** istället för default foreground.
- Tunnare border (`border-border`) men något skarpare skugga (`shadow-sm` → samma men med navy/blå tint) för att efterlikna kth.se:s lätt upphöjda informationskort.
- Chips/badges: byt nuvarande accent till blek KTH-blå bakgrund (`color-mix(in oklab, var(--kth-blue) 10%, white)`) med navy text. Aktiva chips fylld KTH-blå.
- "Visa beskrivning"-knapp i KTH-blå länkstil.
- Highlight-pulsen behåller nuvarande KTH-blå färg (redan korrekt).

### 6. Tomt-läge ("inga resultat")
- Byt panelens stil till samma mönster som kth.se:s notisbanner: sand/krämfärgad bakgrund, info-ikon till vänster, navy rubrik. Knapparna förblir pill (primär fylld KTH-blå, sekundär outline KTH-blå).

### 7. Active filter chips (`ActiveFilterChips`)
- Fylld KTH-blå med vit text + vit X — matchar kth.se:s "valda filter"-stil.

### 8. Mindre detaljer
- Räknaren ("X av Y lokaler") i navy/muted istället för grå.
- H2 "Resultat" i navy och lite tyngre.
- Fokusringar: behåll `--ring` (redan KTH-blå).

## Tekniska detaljer
- Allt sker via Tailwind-klasser i `src/routes/index.tsx`, `src/components/SpaceCard.tsx`, `src/components/ActiveFilterChips.tsx` och `src/components/FilterPanel.tsx`.
- Inga nya tokens behövs — använder befintliga `--kth-navy`, `--kth-blue`, `--kth-sand` från `src/styles.css`.
- Inga ändringar i admin, datalager, server functions eller filtreringslogik.
- Inga nya beroenden, inga nya filer.

## Inte med i denna omgång (kan göras senare om önskat)
- Omarbetade lokalkort (ny bildhantering, status-chips, ny layouthierarki).
- Hero/intro-sektion.
- Ny ikonstil eller egna illustrationer.
- Större layoutförändringar i filterpanelen.