# Länka till en enskild lokal — utan egna sidor

Startsidan har redan en länkparameter (`highlight`) som används när man klickar sig mellan lokaler i beskrivningstexterna. Den kan återanvändas som delbar länk, så vi slipper egna sidor per lokal.

## Så fungerar det

En delad länk ser ut så här:

```text
https://.../?highlight=biblioteket-plan-3
```

När någon öppnar den:
1. Sidan laddas i standardsortering utan filter, så lokalen garanterat finns i listan.
2. Sidan rullar automatiskt ner till kortet och markerar det kort (samma markering som redan används idag).
3. URL:en städas efter markeringen, så att en uppdatering av sidan inte hoppar igen och delning vidare blir ren.

Idag sätts `highlight` bara vid klick inne i appen; den läses inte vid sidladdning. Det är det som byggs.

## Delaknapp per lokal

En diskret länk-ikon i lokalkortets nedre kant (samma stil som övriga små åtgärder):
- Kopierar länken till urklipp och visar en kort bekräftelse ("Länk kopierad").
- På mobil används telefonens vanliga delningsruta när den finns, annars kopiering.
- Ikonen har ett tydligt hjälptext för skärmläsare ("Kopiera länk till Biblioteket plan 3").

## Detaljer att bestämma i bygget

- Länken använder lokalens `slug` (finns redan) — läsbart och stabilt även om namnet ändras något.
- Om en delad lokal är dold eller borttagen: ingen markering, listan visas som vanligt (inget felmeddelande).
- Rullning respekterar "minskad rörelse"-inställningen.

## Teknisk not

Inga schemaändringar, inga nya routes. Berör `src/routes/index.tsx` (läs `highlight` vid första renderingen, nollställ filter, rulla och markera, rensa parametern) och `src/components/SpaceCard.tsx` (delaknappen). Markeringsstilen `.space-highlight` finns redan i `src/styles.css`.
