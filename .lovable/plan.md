# Förbättringsförslag för Hitta studieplats

## Verifierat läge

Jag har gått igenom `src/routes/index.tsx`, `src/components/SpaceCard.tsx`, `src/components/FilterPanel.tsx`, `src/routes/admin.tsx`, `src/lib/filterMatch.ts`, `src/lib/filterSearch.ts`, `src/lib/useLiveActive.ts`, `src/lib/useOpeningHours.ts`, `src/lib/useUiText.ts` och översättningsfilerna. Det som redan fungerar bra:

- Sorteringen är placerad bredvid träffräknaren, är ramfri och har hover-tillstånd.
- Träffräknaren visas på både desktop och mobil och har ett enda `aria-live`-element.
- Platssorteringen summerar studieplatser, nedslagsplatser och datorplatser.
- Namnsorteringen använder svensk kollation även i engelskt läge.
- Öppettider hämtas dynamiskt från KTH:s API och "Visa bara lediga just nu" styrs av `useLiveActive` med 30-sekunders uppdatering.
- Grupprumsfiltreringen visar alla grupprum vid "2–4 pers" men rankar minst platser först.
- Mobila filterbladet är en nederkants-overlay med kryss till vänster och "Rensa filter" till höger.
- Admin har kortbaserad översikt, dolda lokaler krävs innan radering, och redigeringen är uppdelad i flikar.

## 1. Upplevelse och filtrering

### 1.1 Träffantal per filteralternativ i panelen
Visa antal matchande lokaler inom parentes vid varje filtervärde, t.ex. "Tyst (12)". Det minskar risken för nollträffar och gör det lättare att förstå vilka val som är meningsfulla. Kräver en memoiserad räknefunktion som testar varje alternativ mot aktuell sökning.

### 1.2 Smartare tomtillstånd
Idag föreslår tom-listan att ta bort en hel kategori. Förbättring: föreslå att ta bort det enskilda alternativet inom en kategori som kostar flest träffar. Det ger fler användbara förslag, särskilt i kategorier med flera val.

### 1.3 Sök även i beskrivningstext
Fritextsökningen matchar idag namn, lokaltyp, våningsplan och plats. Tillval: låt användaren söka även i beskrivning/info. Risk: fler träffar men mer luddiga. Kan göras som en separat inställning eller alltid påslaget med lägre vikt.

### 1.4 Sekundärsortering
När två lokaler har samma våningsplan eller samma antal platser behålls den manuella ordningen idag. Lägg till namn A–Ö som tiebreak så resultatet blir mer förutsägbart.

### 1.5 Stabilare URL:er för kategorifilter
Kategorivärden lagras som svensk etikett i URL:en (`cats`). Om en admin byter namn på ett alternativ blir gamla länkar tysta nolltäffar. Större omtag: använd `value_key`/id i URL:en och översätt tillbaka till etikett vid läsning.

## 2. Robusthet och underhåll

### 2.1 Sluta hårdkoda "Grupprum" och "Resursrum"
I `src/lib/filterMatch.ts` (rad 51) och `src/components/SpaceCard.tsx` (rad 204) avgörs grupprumsstatus av svenska strängar `"Grupprum"` och `"Resursrum"`. Om en admin ändrar etiketten slutar filtrering och kortlogik att fungera. Byt till `value_key` eller `space_kind`/`intent`.

### 2.2 Rätta engelsk fallback i `useUiText`
I `src/lib/useUiText.ts` (rad 91–109) hämtas en eventuell svensk överskrivning men returneras aldrig – koden returnerar alltid det engelska defaultvärdet. Kommentaren säger att svensk admin-text ska vinna när engelska saknas; det behöver justeras.

### 2.3 Gör `useLiveActive` SSR-säker
Hooken refererar `window` och `document` direkt. Den används först efter hydrering idag, men en `typeof window`-kontroll gör den säker även vid framtida SSR-användning.

### 2.4 Validera admin-formuläret
Admin-formuläret (`FormState`) konverteras manuellt till payload. Inför Zod-validering för t.ex. `booking_room_number`, tal fälten och obligatoriska fält, så att fel fångas tidigt och visas konsekvent.

## 3. Tillgänglighet

### 3.1 Fokusindikator på sorteringsdropdown
`SelectTrigger` har `focus-visible:ring-0`, vilket tar bort fokusringen helt. Behåll en tydlig fokusring för tangentbordsanvändare.

### 3.2 Visa att aktiva filter går att scrolla
`ActiveFilterChips` döljer scrollbaren (`scrollbar-hide`). Lägg till en tonad indikator på höger sida när det finns fler filter än vad som får plats.

### 3.3 Landmärken och rubriknivåer
Resultatlistan har redan `<section>` med `aria-labelledby`. Kontrollera att rubriknivåerna i filterpanelen (`h2`, `h3`) och korten (`h3`) inte hoppar när admin ändrar layout.

## 4. Prestanda

### 4.1 Optimera `useNarrowestFilter`
Hooken filtrerar alla lokaler en gång per aktivt filter. Med många filter och många lokaler blir det dyrt. Cache:a basmatchningen och räkna bara borttag per dimension.

### 4.2 Lazy-loading av bilder utanför viewport
`SpaceCard` eager-laddar de två första bilderna. Överväg `loading="lazy"` för övriga och ett riktigt placeholder-utseende för att undvika layoutskift.

## 5. Admin

### 5.1 Dela upp `admin.tsx`
Filen är över 4 200 rader. Bryt ut i mindre moduler:
- `AdminSpaceList`
- `SpaceEditDialog`
- `FilterEditor`
- `BulkActions`
- `CardLayoutEditor`
Det gör koden lättare att underhålla och testa.

### 5.2 Engelska admin-gränssnittet
Admin är idag helt på svenska. Lägg till översättningsnycklar för admin så att även engelskspråkiga administratörer kan använda det.

### 5.3 Oväntade ändringar i redigeringsdialogen
Dialogen spårar `originalForm` för att varna vid osparade ändringar, men det finns ingen varning idag. Lägg till en varning vid stängning om formuläret har ändrats.

## 6. SEO och metadata

### 6.1 Komplettera index-ruttens head
`src/routes/index.tsx` har bara `title` och `description`. Lägg till `og:title`, `og:description`, `og:type`, `twitter:card` och eventuellt `twitter:title`/`twitter:description` enligt projektets riktlinjer.

## 7. Föreslagen arbetsordning

```text
Fas 1 (snabb vinst, låg risk)
- 3.1 Fokusindikator på sorteringsdropdown
- 2.2 Rätta useUiText-en fallback
- 2.3 SSR-säker useLiveActive
- 6.1 Komplettera index head

Fas 2 (upplevelse)
- 1.1 Träffantal per filteralternativ
- 1.2 Smartare tomtillstånd
- 1.4 Sekundärsortering
- 3.2 Scroll-indikator på aktiva filter

Fas 3 (robusthet, större omtag)
- 2.1 Sluta hårdkoda grupprum/resursrum
- 1.5 Stabilare URL:er med value_key
- 4.1 Optimera narrowest-filter

Fas 4 (admin)
- 5.1 Dela upp admin.tsx
- 5.2 Engelska admin-gränssnittet
- 5.3 Varning vid osparade ändringar
- 2.4 Zod-validering av formuläret
```

Inga databasändringar krävs för Fas 1–2. Fas 3 kan kräva en migrering om vi byter URL-format för kategorifilter.

## Frågor till dig

1. Vilken fas vill du starta med – snabbvinsterna, upplevelseförbättringarna eller admin-uppstädningen?
2. Ska sökningen alltid leta i beskrivningstext, eller vill du ha det som ett separat val?
3. Är du beredd på en större omtag för att byta filter-URL:erna från etiketter till `value_key`, eller ska vi skjuta på det?
