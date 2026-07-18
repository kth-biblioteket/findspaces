# Snabbare avläsning av lokalkorten

Målet är att kortet ska gå att skumma på en sekund: titel → var → hur många platser → egenskaper. Vi rör bara `src/components/SpaceCard.tsx` (presentation) och några tokens i `src/styles.css` vid behov.

## 1. Chips: gruppera visuellt utan rubriker

Idag renderas alla chips (intent + noise + equipment + facility + övriga tags) i en enda `flex-wrap`-rad. Ögat får ingen hjälp att gruppera.

Ändringar i `renderSection("chips")`:

- Dela `categoryChips` i fasta grupper i denna ordning: **intent → noise → equipment → facility → övriga tags**.
- Rendera varje grupp som ett eget `flex-wrap`-block i en yttre flex-container.
- Separera grupperna med:
  - Lite större gap mellan grupper (`gap-x-3`) än inuti en grupp (`gap-x-1.5`).
  - En subtil vertikal avdelare mellan grupper (`<span aria-hidden className="h-4 w-px bg-border/60" />`) som döljs när raden bryter (via `hidden md:inline-block` + `only-child`-hantering, eller enklare: rendera avdelaren mellan grupperna men låt den vara osynlig när den hamnar först på en ny rad — löses med `flex-wrap` + `[&:first-child]:hidden` på en wrapper).
- Tomma grupper renderas inte alls (inklusive deras avdelare).
- Ingen ändring av chip-utseende, klickbarhet, eller filterlogik.

Resultat: samma information, men ögat ser 2–4 tydliga "kluster" istället för en enda rad.

## 2. Header: skärpt hierarki

Just nu ligger titel, plats/lokaltyp och tre platsräknare tätt ihop med liknande vikt. Vi gör tre justeringar:

- **Titel**: behåll storlek, men öka `mb` mot metadata-raden något (från default till `mt-0.5` på metaraden → `mt-1`). Ingen färgändring.
- **Plats-/lokaltyprad**: sänk till `text-muted-foreground` (idag `text-foreground`) så den läses som sekundär. Behåll `MapPin`-ikonen och separator-pipes.
- **Platsräknarna** (studieplatser / nedslagsplatser / datorplatser): lyft dem till en egen rad med tydligare visuell vikt — `text-foreground` (som idag) men `font-medium` på siffran, ikon i `text-foreground/70` istället för `text-muted-foreground`. Öka `mt` från nuvarande till `mt-1.5` så de sitter som en egen "stat-rad" under metadatan.

Slutresultat, uppifrån och ner:
1. **Titel** (stark)
2. Plats · Byggnad · Lokaltyp (dämpad)
3. **N studieplatser · N nedslagsplatser · N datorplatser** (stark, med ikoner)
4. Ev. beläggning/grupprum-badge
5. Notice / info
6. Chips i visuella grupper
7. Knappar

## 3. Vad vi INTE ändrar

- Inga ändringar i filterlogik, klickbeteende, admin-vyn eller kortlayout-inställningar.
- Inga ändringar i chip-färger eller storlekar (fortsatt selected/unselected-stilar oförändrade).
- Ingen ny data, ingen migration.

## Teknisk sammanfattning

- **Filer**: `src/components/SpaceCard.tsx` (både `header`- och `chips`-case i `renderSection`).
- **Tokens**: inga nya krävs; använder befintliga `border`, `muted-foreground`, `foreground`.
- **Risk**: låg — rent presentationsjobb, inga API- eller state-ändringar.

Efter implementation verifierar jag på desktop-preview att grupperingen ser rätt ut för kort med många chips och för kort med bara 1–2 chips (avdelare ska då inte visas).
