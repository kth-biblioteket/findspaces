## Mål
Ändra appens bakgrund till vit (`#ffffff`) eftersom tjänsten ska bäddas in på en sajt med vit bakgrund. Se till att kort, filterpanel och header fortfarande är tydligt åtskilda.

## Förändringar
1. **`src/styles.css`**
   - Ändra `--background` från `oklch(0.965 0 0)` (ljusgrå/sand) till `oklch(1 0 0)` (rent vit).
   - Ändra `--card` från `oklch(1 0 0)` (rent vit) till `oklch(0.985 0 0)` (subtil ljusgrå). Detta gör att korten, filterpanelen och headern behåller en synlig yta mot den nya vita bakgrunden.
   - Överväg att justera `--border` något mörkare om kanterna blir för svaga mot vit bakgrund.

2. **`src/routes/index.tsx`**
   - Verifiera att `bg-background` och `bg-card` används korrekt; inga hårdkodade färger som behöver ändras.

3. **`src/components/SpaceCard.tsx`**
   - Verifiera att korten använder `bg-card` och `border-border`; inga ytterligare ändringar behövs eftersom token-ändringen slår igenom automatiskt.

## Resultat
- Bakgrunden blir vit och smälter sömlöst in i den inbäddande sajten.
- Kort, filterpanel och header får en nästan-vit ljusgrå yta som skapar tydlig visuell separation utan att kännas "färgad".
- Hela appen känns renare och mer integrerad med omgivande webbplats.