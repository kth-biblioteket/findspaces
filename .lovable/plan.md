## Mål
Göra statistikfliken i adminläget mer användbar genom flexibel periodval, export och några extra insikter.

## 1. Välj period med start- och slutdatum
- Behåll snabbvalen (24h, 7d, 30d) men lägg till "Anpassad period".
- Två datumväljare (shadcn `Calendar` i `Popover`, svensk lokalisering) för från/till.
- Slutdatum inkluderar hela dagen (t.o.m. 23:59:59).
- Validering: från ≤ till, max t.ex. 365 dagar för att undvika tunga queries.
- Visa vald period tydligt ovanför graferna ("1 jun – 23 jun 2026").

## 2. Exportera till Excel
- Knapp "Exportera till Excel" bredvid periodväljaren.
- Genererar en `.xlsx` med flera flikar:
  - **Sammanfattning** – nyckeltal (sidvisningar, sessioner, kortklick, bokningsklick, kartklick, filterändringar, sök utan träff) + vald period.
  - **Lokaler** – topp engagerande lokaler (namn + antal interaktioner uppdelat på expand/booking/map).
  - **Filter** – mest använda filter med antal.
  - **Sökningar utan träff** – tidpunkt, sökord, läge, kategorier.
  - **Råhändelser** – alla events i perioden (tid, typ, path, session, payload som JSON).
- Använder `xlsx`-biblioteket (lägg till som dep), filnamn `statistik_YYYY-MM-DD_till_YYYY-MM-DD.xlsx`.

## 3. Övriga förbättringar
- **Tidsserier-graf**: enkel staplad linje/stapel som visar sidvisningar och kortklick per dag (eller per timme om perioden ≤ 48h). Använder befintlig `recharts` om den finns, annars en enkel SVG-spark.
- **Konverteringsmått**: visa "andel sessioner som klickade på bokning" och "andel sessioner som expanderade ett kort" – ger snabb känsla för engagemang.
- **Topp sökord**: lista de vanligaste sökorden (från `filter_change` med `query`) – idag visas bara att sök skett, inte vad.
- **Trafiktoppar**: visa mest aktiva tid på dygnet (timme 0–23) och mest aktiva veckodag.
- **Kortlänkklick**: lägg till `space_link_click` i nyckeltalen (finns i `AnalyticsEvent`-typen men visas inte).
- **Tom-resultat-export**: knapp för att kopiera alla "sök utan träff" – snabb input till content-arbete.

## Tekniska detaljer
- Allt sker klient-sida i `AnalyticsTab.tsx`; query mot `analytics_events` utökas med dynamisk `gte`/`lte` baserat på vald period.
- Limit höjs eller pagineras vid behov (idag 10 000).
- Datumstate hålls lokalt; `useMemo` för aggregering precis som idag.
- Nytt beroende: `xlsx` (SheetJS) för export. `recharts` finns troligen redan via shadcn chart.

## Filer som ändras
- `src/components/AnalyticsTab.tsx` – periodväljare, export-knapp, nya sektioner.
- Eventuellt ny `src/lib/analyticsExport.ts` för xlsx-bygget.
- `package.json` – `xlsx` (om recharts saknas läggs den också till).

## Frågor att bekräfta
- Vill du ha alla föreslagna förbättringar (tidsgraf, konvertering, topp sökord, trafiktoppar) eller bara vissa?
- Ska exporten även innehålla råhändelser, eller räcker de aggregerade flikarna?