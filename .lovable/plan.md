## Ändra toalettikoner

**Nuläge:** "Toalett" använder just nu `Accessibility`-ikonen (en rullstolssymbol), vilket är missvisande för en vanlig toalett.

### Ändringar i `src/lib/spaces.ts`

1. Byt ikon för **"Toalett"** från `Accessibility` till en ikon som föreställer en toalett. Lucide har ingen dedikerad toalett-ikon, så jag använder `Toilet` (finns i Lucide som toalettstol-symbol).
2. Lägg till nytt facilitetsalternativ **"Handikapptoalett"** med `Accessibility`-ikonen (rullstolssymbolen passar här).

```ts
export const FACILITY_OPTIONS = [
  { label: "Mat tillåten", icon: Utensils },
  { label: "Dagsljus", icon: Sun },
  { label: "Skrivare", icon: Printer },
  { label: "Toalett", icon: Toilet },
  { label: "Handikapptoalett", icon: Accessibility },
];
```

### Påverkan

- **Studentvy** (`SpaceCard`) och **filterpanelen**: plockar automatiskt upp den nya ikonen och det nya alternativet via `FACILITY_OPTIONS`.
- **Admin** (`/admin`): det nya facilitetsalternativet dyker upp automatiskt som en valbar pill i formuläret.
- **Databas**: inga schemaändringar behövs — `facilities` är redan en `text[]`. Befintliga rader med "Toalett" fortsätter fungera; "Handikapptoalett" kan läggas till per lokal via adminvyn.

Inga andra filer behöver röras.
