## Mål
Bygga vidare på statistikfliken i adminläget med fyra nya insikter, utan att röra övrig logik på sidan.

## 1. Jämför med föregående period
- Räkna ut en lika lång period direkt före vald period (t.ex. valt 7d → föregående 7d).
- Hämta data för båga perioderna i samma query-omgång (två parallella queries, samma tabell).
- Visa varje KPI-kort med en liten delta-rad under siffran: "+12,4% jmf föregående period" (grön upp, röd ner, grå vid 0/±2%).
- Vid avsaknad av data i föregående period: visa "—".

## 2. Filterkombinationer som ger 0 träffar
- Ny sektion under befintliga "Sökningar utan träff".
- Aggregera `empty_results`-events och gruppera på en normaliserad nyckel av filterkombinationen (sorterade kategorier + workMode + freeOnly, sökord exkluderat så det blir kombinationen som syns).
- Topp 10 kombinationer med antal förekomster, sorterat fallande.
- Tas med i Excel-exporten som ny flik "Filter utan träff".

## 3. Enhets- och källfördelning
- Utöka `track()`-payload i `src/lib/analytics.ts` att skicka med `device` (mobile/tablet/desktop via userAgent + viewport), `referrer` (document.referrer host) och ev. UTM-parametrar (utm_source/medium/campaign från URL) på `page_view`.
- I AnalyticsTab: två nya sektioner sida vid sida.
  - **Enhet**: stapeldiagram mobil/desktop/tablet (andel av sidvisningar).
  - **Källa**: lista över top referrers + UTM-källor (interna/direkta = "direkt").
- Befintliga events fungerar oförändrat; nya fälten är optional på Row-typen.
- Excel-flik "Källor" med referrer, utm_source, utm_medium, utm_campaign, antal.

## 4. Heatmap veckodag × timme
- Ersätt INTE de två befintliga graferna (timme/veckodag) – komplettera med en heatmap under dem.
- 7×24 rutnät (måndag överst, 00–23 i kolumner), färgintensitet via opacity på `--primary`.
- Tooltip per cell: "Tis 14:00 · 23 sidvisningar".
- Implementeras som enkel CSS-grid i samma stil som övriga sektioner (ingen ny dep).

## Tekniska detaljer
- Alla ändringar i `src/components/AnalyticsTab.tsx`, `src/lib/analyticsExport.ts` och `src/lib/analytics.ts`.
- Föregående-period query körs via samma `useQuery` med två tidsfönster (en extra queryKey).
- Device-detektion: enkel regex på `navigator.userAgent` + `window.innerWidth < 768` fallback.
- UTM/referrer läses i `track()` vid `page_view` så historisk data påverkas inte – nya datapunkter får dem framåt.
- Inga DB-migrationer behövs (`payload jsonb` rymmer fälten redan).

## Filer som ändras
- `src/components/AnalyticsTab.tsx` – delta-badges, nya sektioner, heatmap.
- `src/lib/analytics.ts` – berika `page_view`-payload.
- `src/lib/analyticsExport.ts` – nya flikar "Filter utan träff" och "Källor".

## Att bekräfta
- Vill du att deltan visas på alla KPI-kort eller bara de viktigaste (sidvisningar, sessioner, bokningsklick)?
- Heatmap-färg: ren primary-opacity (matchar tema) eller en grön→röd-skala?
