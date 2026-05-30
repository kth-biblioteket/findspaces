# Plan: Rensa-knapp i desktop + förbättringsförslag

## Del 1 – Implementera nu

**Rensa filter i desktop-sidopanelen**
- I `src/routes/index.tsx`: i `<aside>`-sidopanelen, lägg till en rad ovanför `<FilterPanel>` som visar antal aktiva filter och en "Rensa alla"-knapp som anropar `setFilters(emptyFilters)`.
- Knappen visas endast när `hasActiveFilter` är true (annars disabled/dold) så att layouten inte hoppar.
- Stil: liten textknapp i KTH Blue, ikon `X` från lucide-react, `focus-visible`-ring för tillgänglighet.
- Resultaträknaren i headern (`{filtered.length} av {spaces.length}`) bibehålls.

Det är hela kodändringen – isolerad till `index.tsx`.

## Del 2 – Förslag på vad som saknas jämfört med liknande sajter (TU Delft, Aalto, Lund, m.fl.)

Inget av nedanstående byggs i denna plan – välj vad du vill prioritera så gör jag en separat plan.

1. **Aktiva filter som "chips" ovanför resultatlistan** – varje vald filter blir en liten pill med X för att ta bort enskilt filter. Standard på i stort sett alla moderna sökgränssnitt.
2. **Öppningstider / "Öppet nu"-indikator** – per lokal, ev. ett filter "Öppet just nu".
3. **Karta-vy** – växla mellan lista och karta (planritning av biblioteket) med markörer för varje lokal. KTH:s nuvarande hitta-på-KTH löser detta separat, men inbäddad miniplan är vanligt.
4. **Realtids-beläggning** – "X av Y platser lediga" om sensordata finns; annars en upplevd-trafik-indikator (lugnt/medel/fullt) som admin kan sätta.
5. **Direktbokning i kortet** – idag länk ut. Vissa system har inline-bokningsmodul.
6. **Favoriter / "spara lokal"** – localStorage-baserat, ingen inloggning krävs.
7. **Delbar URL för filter** – synka `filters` med query string så man kan länka till t.ex. "tysta grupprum med whiteboard".
8. **Sortering** – t.ex. "Närmast entré", "Störst kapacitet", "A–Ö".
9. **Bättre tomt-tillstånd** – när inga lokaler matchar: föreslå vilket filter som är "smalast" och erbjud "ta bort det".
10. **Språkväxel SV/EN** – KTH är tvåspråkigt; engelsk version av UI och innehåll.
11. **Tillgänglighet-filter på lokalnivå** – "Rullstolsanpassad", "Hörselslinga", "Justerbar belysning" (delvis täckt av faciliteter idag).
12. **Bildgalleri-lightbox** – klick på kortbild öppnar full storlek (idag bara karusell i kortet).
13. **Vägbeskrivning / våningsplan-länk** – "Visa på planritning" per lokal utöver generell kartlänk.
14. **Brödsmulor / sektionsnavigering i headern** – Om/Kontakt/FAQ-sidor (idag finns bara start + admin).
15. **Skeleton-laddning** istället för "Laddar..."-text.
16. **Analytics-eventspårning** – vilka filter används mest, vilka lokaler klickas på (kräver Cloud-funktion).

Vill du att jag bygger Del 1 direkt och sedan tar något av punkterna i Del 2?
