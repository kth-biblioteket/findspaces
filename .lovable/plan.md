## Mål

1. Ge den tillfälliga notisrutan ett mer proffsigt, designintegrerat utseende — mjuk amber med vänsterkant-accent istället för gul "varnings"-block.
2. Lägga till ett nytt fält "Information" (sv + en) för lugn, icke-akut info som visas direkt på kortet, neutralt stilsatt, placerat under chips och ovanför knapparna.

## Ändringar

### 1. Databas
Ny migration som lägger till två kolumner på `public.spaces`:
- `info_sv text`
- `info_en text`

Befintliga rader får `NULL` (visas inte). Inga RLS-ändringar behövs — befintliga policies täcker nya kolumner.

### 2. Typer & datalager
- `src/integrations/supabase/types.ts`: lägg till `info_sv`, `info_en` på `spaces`.
- `src/lib/spaces.ts`: lägg till fälten i `Space`-typen och i select-listan.

### 3. SpaceCard — notisrutans nya design
Ersätt nuvarande `bg-amber-100 / border-amber-200 / text-amber-900`-blocket med en lugnare variant:

- Bakgrund: mycket ljus amber (≈ `#FEFBF3` / `amber-50/60`)
- Vänsterkant: 3 px solid amber-500 (KTH-vänlig accentkant)
- Tunn ram i amber-200/60 runt resten
- Text i `foreground` (inte amber-900) för bättre läsbarhet
- Mindre ikon, samma `Info`-ikon men i amber-600
- Lite mer rundade hörn (`rounded-lg`) och tightare padding

Resultatet: syns tydligt som "notera detta" utan att skrika gult.

### 4. SpaceCard — nytt neutralt info-fält
- Lägg till `localizedInfo = pickLocalized(space, "info", lang)` (med fallback sv→en på samma sätt som övriga fält).
- Rendera som ny sektion `info` i kortets layout, placerad **under chips, ovanför knapparna**.
- Stil: neutral, ingen färgad bakgrund. Liten `Info`-ikon i `muted-foreground`, text i `text-sm text-foreground/80`, tunn separator-känsla (ev. `border-l border-border pl-3`). Tydligt skild från den amberfärgade notisen så användaren förstår att det är "bra att veta", inte "obs".

### 5. Adminläget (`src/routes/admin.tsx`)
Lägg till två nya textareas per lokal under befintliga notis-fälten:
- "Information (svenska)" — placeholder ex: *"Möblerna är tillfälliga och byts ut under hösten."*
- "Information (engelska)"
- Hjälptext som förklarar skillnaden mot Notis: *"Neutral information som alltid visas på kortet. Använd Notis för tillfälliga/akuta meddelanden."*

Spara med övriga fält i samma update-flöde.

### 6. i18n
Inga nya översättningsnycklar krävs för själva texten (kommer från databasen). Eventuell `card.info_sr` för skärmläsare läggs till i `sv.json`/`en.json` om vi vill ha en dold rubrik.

## Tekniska detaljer

- Layout-systemet (`useCardLayout`) styr idag sektionsordningen via `CardSectionKey`. Det nya info-blocket renderas inom kortets befintliga flöde direkt före `mt-auto`-rad med knappar — det behöver alltså **inte** bli en ny `CardSectionKey` om vi vill hålla det enkelt. Alternativt: lägg till `"info"` som ny key så admins kan flytta det. Förslag: håll det enkelt först, lägg in som fast position (under chips, ovanför knappraden).
- Fallback-logik för info_en följer samma mönster som alt-texter: tom EN → visa SV.
- Migration följer projektets GRANT-konvention (inga nya tabeller, bara `ALTER TABLE` — inga nya grants behövs).

## Filer som ändras

- ny: `supabase/migrations/<timestamp>_add_info_fields.sql`
- `src/integrations/supabase/types.ts`
- `src/lib/spaces.ts`
- `src/components/SpaceCard.tsx` (ny notisstil + nytt info-block)
- `src/routes/admin.tsx` (två nya textareas + hjälptext)
- ev. `src/i18n/locales/sv.json` + `en.json` (sr-only label)
