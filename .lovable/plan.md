## Mål
Modernare, luftigare utseende: vit bakgrund överallt, inga grå ramar runt kort/filterpanel, och rubriken "Studieplatser" borttagen så översta kortet linjerar med filterpanelens topp.

## Ändringar

**1. Ta bort resultatrubriken (`src/routes/index.tsx`)**
- Ta bort `<h2>Studieplatser</h2>`-raden och dess wrapper.
- Antalsräknaren ("47 lokaler") döljs när inga filter är aktiva. När filter är aktiva visas den som liten diskret text ovanför korten (t.ex. "12 av 47 lokaler").
- Detta gör att översta lokalkortet linjerar med filterpanelens överkant på desktop.

**2. Vit bakgrund överallt (`src/styles.css`)**
- `--background` → vit (redan vit).
- `--card` → vit (idag ljusgrå `oklch(0.985 0 0)`).
- Header behåller en subtil nedre border som avgränsning mot innehållet.

**3. Ta bort grå linjer, ersätt med mjuk skugga**
- `src/components/SpaceCard.tsx`: ta bort `border border-border`, lägg till mjuk skugga (`shadow-sm hover:shadow-md transition-shadow`).
- `src/routes/index.tsx`: filterpanelens wrapper – ta bort `border border-border`, lägg till samma mjuka skugga. Behåll intern avdelare under "Filter"-rubriken.
- "Inga träffar"-rutan: samma behandling (skugga istället för border).

**4. Småjusteringar för att vit-på-vit ska kännas avgränsat**
- Chips, knappar och inputs som idag förlitar sig på `bg-muted`/`bg-card` mot grå bakgrund kontrolleras så de fortsatt syns – framförallt aktiva filter-chips (redan blå, OK) och sökfält i filterpanelen (lägg vid behov till tunn border på input).

## Berörda filer
- `src/routes/index.tsx`
- `src/styles.css`
- `src/components/SpaceCard.tsx`
- (ev. mindre justering i `src/components/FilterPanel.tsx` om sökinput tappar kontrast)

Inga ändringar i logik, data eller filtrering.