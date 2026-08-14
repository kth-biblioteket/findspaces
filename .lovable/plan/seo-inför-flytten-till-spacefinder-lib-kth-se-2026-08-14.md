# SEO inför flytten till spacefinder.lib.kth.se

Grunden finns redan (canonical, og-taggar, hreflang, robots.txt, sitemap). Det som återstår är att göra adressbytet till en enda inställning och att fixa några saker som sökmotorer och delningar faktiskt påverkas av.

## 1. Ny adress som enda inställning

Idag är fallback-adressen demo-adressen. Vi byter fallback i `src/lib/siteUrl.ts` till `https://spacefinder.lib.kth.se` (fortsatt överstyrbar via miljövariabel), så att canonical, og:url, og:image, hreflang och sitemap följer med automatiskt vid flytten. Fram till flytten kan demo-adressen sättas via miljövariabel om du vill.

## 2. Engelsk version får svensk metadata idag

`?lang=en` visar exakt samma titel, beskrivning och og-text som svenska sidan. För sökmotorer och delningar ser engelska versionen därför ut som en dubblett på svenska.

Fix: låt sidans metadata följa `?lang`-parametern — engelsk titel/beskrivning/og-text när `lang=en`, och canonical som pekar på just den språkversionen (`/?lang=en`) istället för alltid på startsidan. Även `<html lang>` sätts serverrenderat efter språket, inte hårdkodat `sv`.

## 3. Delningslänkar ska inte indexeras som egna sidor

Delade länkar innehåller `?highlight=…&name=…`. De ska inte bli egna träffar i Google. Canonical rensas därför från allt utom `lang`, så alla delningsvarianter samlas på rätt sida.

## 4. Admin och inloggning

`robots.txt` blockerar redan `/admin` och `/login`, men en blockerad sida kan ändå listas i sökresultat. Vi lägger `noindex` direkt på de sidorna.

## 5. Sitemap-hänvisning och strukturerad data

- `Sitemap:`-rad i `robots.txt` som pekar på den nya adressen.
- JSON-LD på startsidan (WebSite + Library/Organization för KTH Biblioteket) så att Google förstår vad tjänsten är och vem som står bakom.

## 6. Vid själva flytten (inte kodändringar)

- Permanent omdirigering (301) från demo-adressen till nya adressen, inklusive frågeparametrar.
- Lägg till `https://spacefinder.lib.kth.se` som tillåten adress i backend för admin-inloggning.
- Verifiera den nya domänen i Google Search Console och skicka in sitemapen.

## Teknisk not

- `src/lib/siteUrl.ts`: ny fallback-URL.
- `src/routes/index.tsx`: språkberoende `head()` via sökparametern `lang`, självrefererande canonical per språk, JSON-LD i `head().scripts`.
- `src/routes/__root.tsx`: `<html lang>` från förfrågan istället för fast `sv`.
- `src/routes/admin.tsx`, `src/routes/login.tsx`: `robots: noindex, nofollow`.
- `public/robots.txt`: `Sitemap:`-rad.
- Inga databasändringar.
