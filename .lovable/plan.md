## Mål
Byt ut den nuvarande inline-expanderbara beskrivningen på lokalkortet mot en "Om lokalen"-knapp som öppnar beskrivningen i en modal (shadcn `Dialog`). Korten blir mer kompakta och konsekventa i höjd, och beskrivningen får mer läsutrymme när den öppnas.

## Förändringar

### 1. `src/components/SpaceCard.tsx`
- Ta bort den inline-utfällbara sektionen (knappen med `ChevronDown` + det grid-animerade beskrivningsblocket längst ner i `<article>`), samt tillhörande `open`-state och `aria-controls`-blocket.
- Lägg in en ny knapp **"Om lokalen"** (en: "About this space") i samma knapprad som de andra länkknapparna (`renderedButtons`), med en `Info`-ikon. Stilen följer befintliga sekundärknappar så den smälter in.
- Knappen renderas bara när `sanitizedDescription` finns.
- Klick öppnar en `Dialog` (shadcn) med:
  - `DialogTitle` = lokalens namn (`localizedName`)
  - `DialogDescription` (visuellt dold via `sr-only`) för a11y
  - Innehåll: samma sanitized HTML som idag, samma typografi-klasser (`text-sm leading-relaxed`, listor, länkstil med `--kth-blue`).
  - Max-bredd ~`max-w-xl`, scrollbar inuti vid lång text (`max-h-[80vh] overflow-y-auto`).
- Behåll `track("card_expand", ...)`-eventet men trigga det när modalen öppnas (samma namn för analytikskontinuitet).

### 2. `src/i18n/locales/sv.json` och `en.json`
- Lägg till `card.about_button`: "Om lokalen" / "About this space".
- Behåll `show_description`/`hide_description` tills vidare (används inte längre på kortet, men finns kvar i `useUiText` så admin-texterna inte bryts). Kan städas i ett separat steg.

### 3. `src/lib/useUiText.ts` (valfritt nu)
- Lägg till en ny nyckel `about_button` så att texten går att redigera i adminläget under "Texter", på samma sätt som övriga knapptexter. Default på sv/en enligt ovan.

### 4. Admin-förhandsvisning (`src/routes/admin.tsx`)
- Inga strukturella ändringar krävs — `SpaceCard` används som den är, så den nya knappen visas automatiskt i kortlayout-fliken.

## Tekniska detaljer
- Använder befintliga `@/components/ui/dialog` (shadcn). Ingen ny dependency.
- Modalens innehåll renderas fortfarande via `dangerouslySetInnerHTML` med samma `sanitizedDescription` (DOMPurify-sanitering oförändrad).
- `e.stopPropagation()` på knappens onClick så att kortets ev. klick inte triggas.
- Ingen ändring i datalager eller filter.

## Ej i scope
- Översyn av övrig kortlayout, animationer, eller andra knappar.
- Borttagning av oanvända `show_description`/`hide_description`-nycklar (görs separat om önskas).
