## Mål
Generera en fil med `INSERT INTO public.spaces (...) VALUES (...);` för varje rad i tabellen `spaces`, som kan köras direkt mot en annan PostgreSQL-databas.

## Tillvägagångssätt
1. Kör en SQL-fråga mot databasen som bygger INSERT-satser dynamiskt med `format()` och `information_schema.columns` — så att alla 47 kolumner tas med i rätt ordning och alla datatyper (text, arrays, jsonb, timestamptz, boolean, numeric) blir korrekt quotade via `quote_nullable()`.
2. Skriv resultatet till `/mnt/documents/spaces_inserts.sql` så du kan ladda ner filen.
3. Filen inleds med en kommentar med radantal och exportdatum, och varje rad blir en fristående `INSERT`-sats (enkla att köra selektivt eller alla på en gång).

## Noteringar
- Ingen schemadel exporteras — bara data. Måltabellen måste redan finnas med samma kolumner.
- Kolumnen `id` inkluderas som den är (behåller befintliga UUID:er). Vill du hellre låta måldatabasen generera nya id kan vi lätt utesluta den kolumnen.
- Om du vill ha `ON CONFLICT (id) DO NOTHING` eller `DO UPDATE` för idempotent import lägger vi till det — säg till.
