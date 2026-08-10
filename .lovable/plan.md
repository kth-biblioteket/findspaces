# Nya förbättringsförslag

Den tidigare listan är helt genomförd. Här är ett nytt urval, sorterat efter nytta för användarna först.

## A. Studentvyn

**A1. Dela och återvänd till en sökning**
Filtren ligger redan i URL:en. Lägg till en "Kopiera länk"-knapp vid sorteringen så en student enkelt kan dela sin filtrering, plus en kort bekräftelse när länken kopierats.

**A2. Direktlänk till en enskild lokal**
Idag finns bara startsidan. En egen sida per lokal (`/lokal/<namn>`) ger delbara länkar, egen titel/förhandsvisning vid delning och bättre synlighet i sökmotorer. Kortet i listan får en "Visa lokal"-länk.

**A3. Kom ihåg senaste val**
Spara valt språk och senast använda filter lokalt i webbläsaren, med en diskret "Återställ filter"-knapp. Återkommande besökare slipper börja om.

**A4. Tydligare laddning av liveinformation**
Beläggning och lediga grupprum hämtas efter att sidan ritats. Visa en liten "uppdaterar"-indikator och en tidsstämpel ("uppdaterad 08:31") så det syns att uppgiften är färsk.

**A5. Skärmläsarmeddelande vid filtrering**
När träfflistan ändras annonseras inget. Lägg ett artigt statusmeddelande ("12 av 56 lokaler matchar") som läses upp vid varje filterändring.

## B. Admin

**B1. Dela upp admin-filen**
`src/routes/admin.tsx` är 4 408 rader. Bryt ut lokalredigeraren, filterhanteringen, texterna och listan till egna filer under `src/components/admin/`. Ingen funktionsändring, men mycket lättare att underhålla vidare.

**B2. Ångra vid dölj/radera**
Idag är dölj och radera bekräftelsedialoger. Lägg till en "Ångra"-knapp i bekräftelsen efter åtgärden (några sekunder) — snabbare och mindre riskfyllt.

**B3. Sökfält och filtrering i lokallistan**
Med många lokaler blir listan lång. Lägg till fritextsök på namn samt snabbfilter för dolda/publika och kategori.

**B4. Förhandsvisning av lokalkortet i redigeraren**
Visa kortet som studenten ser det bredvid formuläret, så admin direkt ser effekten av texter, ikoner och antal platser.

## C. Kvalitet och drift

**C1. Fler automatiska tester**
Det finns tester för filtermatchning och URL-filter. Utöka med tester för sorteringsordningen, tomtillståndets förslag och admin-validering, så framtida ändringar inte tyst går sönder.

**C2. Bildstorlekar**
Uppladdade bilder skalas i webbläsaren. Generera en mindre variant vid uppladdning och servera rätt storlek per skärm — snabbare laddning på mobil.

**C3. Felhantering vid tappat nätverk**
Om anropen misslyckas visas ett generellt fel. Lägg till "Försök igen"-knapp och behåll tidigare resultat i stället för tom sida.

## Teknisk not

Inget av ovanstående kräver schemaändringar utom A2 (kräver en stabil slug per lokal) och C2 (extra bildvariant i lagringen). Övrigt är front-end och struktur.

## Förslag på ordning

1. A1, A5, C3 (små, snabb nytta)
2. B3, B2, B4 (adminupplevelse)
3. A2, C2 (kräver data-/lagringsändring)
4. B1, C1 (underhåll)
