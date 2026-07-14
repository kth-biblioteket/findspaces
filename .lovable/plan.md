
# Genomgång av appen inför lib.kth.se + iframe på kth.se

Nedan är en samlad förbättringslista efter en genomgång av routes, komponenter, hooks, i18n, styling, server- och build-konfig. Jag har grupperat förslagen efter tema och satt en ungefärlig prioritet (P1 = viktigt inför flytt, P2 = bra att göra snart, P3 = polering).

Inget kod har ändrats än — det här är beslutsunderlag. Säg till vilka block du vill att jag går vidare med, så gör jag en riktig implementationsplan per område.

## 1. Iframe-embed på kth.se (P1)

Det här är den mest kritiska bunten eftersom hela leveransen bygger på det.

- **CSP / X-Frame-Options**: Idag skickas inga headers som tillåter/förbjuder framing. Sätt `Content-Security-Policy: frame-ancestors https://www.kth.se https://kth.se https://lib.kth.se 'self'` i `src/server.ts`. Ta bort ev. `X-Frame-Options` (den kan inte lista flera origins).
- **Cookies / storage i iframe**: `localStorage` (språkval, i18n-detector, ev. auth-tokens) räknas som "third-party storage" när sidan ligger i iframe på kth.se. På moderna webbläsare (Safari ITP, Chrome partitioned storage) kan detta blockeras. Lös genom att:
  - Sätta `SameSite=None; Secure; Partitioned` på auth-cookies (Supabase-flödet i admin).
  - Ha en fallback för i18n om `localStorage` kastar (t.ex. postMessage från parent, eller `?lang=`-parameter i URL).
- **Auth i iframe**: `admin.tsx` + `login.tsx` fungerar troligen dåligt embeddat. Överväg att kräva att admin nås direkt på `lib.kth.se/admin` (utanför iframe). Studentvyn (`/`) är det som bäddas in.
- **Djuplänkar från kth.se → iframe**: Bestäm om URL-state (filter, `?highlight=`) ska synkas till parent via `postMessage` så att KTH-sidan kan uppdatera sin URL / dela länkar. Idag ändras bara iframens interna URL, vilket inte syns för besökaren.
- **Höjdhantering**: Iframen har fast höjd på kth.se. Lägg till en liten `postMessage`-baserad höjdrapportör (ResizeObserver på `<main>`) så att kth.se-mallen kan sätta iframe-höjden dynamiskt och slippa dubbla scrollbars på mobil.
- **`inIframe`-flagga finns redan** i `index.tsx` men används inte. Nyttja den för att t.ex. dölja/anpassa språkväxlaren om kth.se redan har en, dölja "Om lokalen"-länkar som pekar till en yttre sida i ny flik (`target="_blank"`), och undvika `window.top`-navigering.
- **Skip-link och focus**: `#main` skip-länken i `__root.tsx` fungerar illa i iframe (den flyttar fokus i iframen men användaren är i parent-dokumentets flöde). Antingen dölj i iframe-läge eller dokumentera för kth.se-mallen.

## 2. Tillgänglighet (WCAG 2.1 AA — KTH är lagkrävt) (P1)

- **Landmarks & rubriker**: Verifiera att `<main id="main">` finns, att H1 är unik per route, och att filtersheet öppnas med `role="dialog"` + `aria-modal="true"` (Sheet från shadcn brukar göra rätt men värt att kolla labels).
- **Kontrast**: Kör tokens i `src/styles.css` genom en kontrast-check mot AA (4.5:1 för text). Speciellt "muted-foreground" och pills i inaktiverat läge brukar vara nära gränsen.
- **Tangentbordsflöde**: Testa hela filter- och kortflödet utan mus. `PillToggle`, `FilterPanel`, `ImageCarousel` och `ImageLightbox` behöver Enter/Space/Escape och pilnavigering.
- **Skärmläsare**: Alt-texter finns i `image_alts` + `image_alts_en` — bra. Se till att kort och länkar inte har "tomma länkar" (`<a href>` utan tillgänglig text runt bara ikoner).
- **Rörelse / animation**: Respektera `prefers-reduced-motion` i ev. carouseller och hover-transitions.
- **Språk**: `<html lang>` uppdateras redan när användaren växlar — bra. Se till att engelska strängar som saknas inte tystvis faller till svenska utan `lang`-attribut på span.

## 3. SEO / delbarhet (P2)

Om appen embeddas i iframe är SEO för `hitta-studieplats.lovable.app`/`lib.kth.se` mindre kritisk (kth.se-sidan indexeras istället), men fortfarande värt:

- Sätt unika `head()`-titlar och `og:description` på `/admin` och `/login` (idag ärver de troligen root).
- Lägg canonical som pekar till kth.se-sidan när appen körs i iframe (via en `<link rel="canonical">` som byggs klient-sidigt när `inIframe`).
- Ta bort/uppdatera Lovable-genererade `og:image` innan flytt.
- Lägg `robots.txt` som tillåter allt på lib.kth.se; ev. `noindex` på `/admin` och `/login`.

## 4. Prestanda & datalager (P2)

- **`spacesQueryOptions` hämtar `select("*")`** på alla lokaler. Om antalet växer, hämta bara fält som listkortet behöver och lazy-hämta fulla objektet vid detaljvy.
- **Bildvikt**: `SpaceCard`/`ImageCarousel` — säkerställ att bilder serveras med `srcset`/`sizes`, moderna format (AVIF/WebP), och `loading="lazy"`+`decoding="async"`.
- **Realtid**: `useOccupancy` + `useGroupRoomAvailability` polar var 60:e sek. I iframe som ligger nedskrollat på kth.se → sätt `refetchIntervalInBackground: false` (default är false, dubbelkolla) och pausa när `document.hidden`.
- **Bundle**: `admin.tsx` är 3428 rader. Splittra i mindre chunks (`AnalyticsTab`, filter-editor, spaces-editor) och lazy-loada — student-bundlen ska inte behöva admin-kod.
- **Fonts**: Figtree laddas från Google Fonts. Överväg self-hosta (`fonts/`) för att slippa third-party i iframe (CSP/GDPR-vänligare) och snabbare LCP.

## 5. Säkerhet (P1)

- **RLS-genomgång**: Verifiera att alla tabeller (`spaces`, `filter_categories`, `filter_options`, `app_settings`, ev. analytics) har RLS på och att policies stämmer med `has_role`. Kör `security--run_security_scan`.
- **Admin-skydd**: `/admin`-route ska ha auth-gate serverside (loader) eller ligga under `_authenticated/`. Kolla att man inte kan nå formulär via klientnavigering utan giltig session.
- **CSP**: utöver `frame-ancestors`, sätt `Content-Security-Policy` med `default-src 'self'`, tillåt Supabase-URL, Google Fonts, ev. R2/CDN för bilder. Undvik `unsafe-inline` om möjligt.
- **Secrets**: Kolla att inga service-role-nycklar loggas eller läcker via `console.error`.

## 6. Kod-kvalitet & underhåll (P2)

- **`admin.tsx` 3428 rader** → dela upp i `src/routes/admin/` med underroutes eller åtminstone bryt ut till `src/components/admin/*`.
- **`index.tsx` 608 rader** — sortering + filterlogik kan brytas ut till `useSpaceListing()` hook för testbarhet.
- **Testning**: `e2e/filters.spec.ts` finns. Bygg ut med tester för iframe-läge (headers, postMessage-höjd), språkbyte, och admin-CRUD.
- **Typescript**: Widening av `SpaceKind` till string gjorde tidigare filter-URL:er mer permissiva. Överväg zod-parsing på `validateSearch` istället för handskriven validering.

## 7. UX-detaljer (P3)

- **Tomt resultat**: `useNarrowestFilter` är fin — komplettera med "Rensa alla filter"-knapp bredvid förslagstexten.
- **Sortering**: `SortKey`-menyn är stor på mobil. Överväg segment-control eller flytta in i filter-sheeten.
- **URL-state**: Vid embed lönar det sig att kunna dela en direktlänk till "grupprum, 5+, ledigt just nu" — dokumentera URL-schemat.
- **Språkväxlare** i iframe: Prata med kth.se-teamet om deras språkflöde ska styra vår i18n via `?lang=` eller `postMessage`, så att växlingen sker på ett ställe.
- **Offline/fel**: `ErrorComponent` i `__root.tsx` bra. Lägg en enkel "Kunde inte ladda lokaler"-skeleton om `spacesQuery` failar (nu ser man antagligen tom lista).

## 8. Konkret checklista inför flytt till lib.kth.se

1. Bestäm slutlig URL (`lib.kth.se/hitta-studieplats/` eller motsvarande) och verifiera att TanStack Router fungerar på under-path (kan kräva `basepath`).
2. Sätt `frame-ancestors` CSP för kth.se-origin.
3. Höjdrapportör via `postMessage`.
4. Self-hosta fonter + logga bort Google Fonts.
5. Skriv om `og:image`, titlar och `robots.txt`.
6. Kör Lighthouse (mobil, embedded) + axe-core, åtgärda AA-brister.
7. Kör `security--run_security_scan` och SEO-scan.
8. Dokumentera URL-schema + `postMessage`-API för kth.se-teamet.

---

**Fråga till dig**: vilka av områdena (1–8) ska jag börja med? Jag rekommenderar att vi tar 1 (iframe-embed) och 5 (säkerhet) först eftersom de är blockerande för lansering, sedan 2 (a11y) och 4 (prestanda). Säg till om du vill att jag prioriterar annorlunda eller vill djupdyka i något specifikt (t.ex. skriva en riktig implementationsplan bara för iframe-delen).
