# Fler liknande risker (webbläsare, särskilt Safari/iOS)

Genomgång av koden efter samma typ av problem som Figtree-buggen: sådant som fungerar i Chrome men tyst går fel någon annanstans. Sorterat efter sannolik påverkan.

## 1. Typsnittet laddas sent (ingen förladdning)
Typsnittsfilerna ligger nu lokalt, men de hittas först efter att CSS:en lästs in. Det ger en kort blänk med systemtypsnitt vid första besöket.
**Åtgärd:** lägg `<link rel="preload">` för de två woff2-filerna i sidhuvudet.

## 2. Bilduppladdning i admin kan misslyckas tyst
Uppladdade bilder konverteras till WebP i webbläsaren. Äldre Safari (och vissa iPad-versioner) kan neka den konverteringen, och då blir resultatet en tom fil utan felmeddelande.
**Åtgärd:** kontrollera att konverteringen lyckades, annars falla tillbaka på JPEG och visa ett tydligt fel om även det misslyckas.

## 3. Privat läge / blockerade kakor
Driftsmeddelandets "dölj"-val och adminlistans sparade filter skrivs direkt till webbläsarlagringen. I privat läge eller med hårda integritetsinställningar kastar det ett fel som kan släcka sidan.
**Åtgärd:** kapsla in läsning/skrivning så att appen fungerar även när lagring nekas.

## 4. Färgerna (oklch) på äldre enheter
Hela färgsystemet använder ett modernt färgformat. På iOS äldre än 15.4 blir följden osynlig text/rutor, inte bara fel nyans.
**Åtgärd:** avgör om vi bryr oss om så gamla enheter; om ja, lägg en enkel reservfärg per token.

## 5. Höjd på mobil (dvh) och sticky filterpanel
Filterluckan och sidhöjden använder dynamisk viewport-höjd. På iOS kan panelen bli några pixlar för hög när adressfältet krymper, med dubbla rullningslister som följd.
**Åtgärd:** verifiera i mobilt Safari-läge och justera med en säkerhetsmarginal vid behov.

## 6. Tabellstilar med modern CSS-selektor
Två ställen i tabellkomponenten använder `:has(...)`. Det finns inte i Firefox-versioner före 121 — bara kosmetiskt, men värt att veta.
**Åtgärd:** låg prioritet; byt till vanlig klass om vi vill vara helt säkra.

## 7. Sortering och tider
Sortering (A–Ö) och öppettider bygger på webbläsarens språk- och tidszonsstöd. Det är brett stött, men värt en snabb kontroll att svensk bokstavsordning och Stockholmstid ger rätt resultat i Safari.

## Förslag på ordning
1. Punkt 1 och 3 (små, tar bort synliga och potentiellt sidsläckande fel)
2. Punkt 2 (skyddar adminarbetet)
3. Punkt 5 och 7 (verifiering i Safari)
4. Punkt 4 och 6 (bara om äldre enheter ska stödjas)

## Teknisk not
Inga schemaändringar. Punkt 1 rör `src/routes/__root.tsx`, punkt 2 `src/lib/processImage.ts`, punkt 3 `AnnouncementBanner.tsx`/`SitePageLayout.tsx`/`admin.tsx`, punkt 4–5 `src/styles.css`.
