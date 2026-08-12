# Inför flytten till spacefinder.lib.kth.se

Delalänkarna klarar sig själva (de byggs från den adress besökaren är på). Det som däremot är hårdkodat mot demo-adressen idag är sidans metadata, och några saker saknas helt. Förslag på vad vi fixar innan flytten.

## 1. Adressberoende metadata (viktigast)

Idag pekar följande på `hitta-studieplats-demo.lovable.app`:
- `og:url` och `canonical` på startsidan
- `og:image` / `twitter:image` (både på startsidan och i roten)

Konsekvens efter flytten: delningar i Slack/Teams/sociala medier hämtar bild och adress från den gamla demo-adressen, och sökmotorer får en canonical som pekar bort från den riktiga tjänsten.

Fix: bygg dessa värden från en enda inställning för webbplatsens adress (miljövariabel med nuvarande adress som fallback), så att bytet blir en rad att ändra. Ta även bort dubblerad og:image i roten så att startsidan äger sin egen bild.

## 2. robots.txt och sitemap saknas

Tjänsten har ingen `robots.txt` och ingen `sitemap.xml`. Vi lägger till båda (sitemap med startsidan, byggd från samma adressinställning) så att KTH-domänen indexeras rent från dag ett.

## 3. Språkversioner för sökmotorer

Sidan finns på svenska och engelska via `?lang=`. Vi lägger till `hreflang`-länkar (sv, en, x-default) så att rätt version visas i sökresultat.

## 4. Inloggning och backend

Adressen till tjänsten är registrerad i backend för inloggningslänkar och omdirigering efter inloggning. Den behöver kompletteras med `https://spacefinder.lib.kth.se` när domänen är klar, annars fastnar admin-inloggningen på gamla adressen. Detta görs vid själva flytten, inte nu — men vi noterar det som ett steg i checklistan.

## 5. Omdirigering av gamla länkar

Redan delade länkar mot nuvarande adress fungerar bara om den adressen pekas om till den nya. Rekommendation: behåll den gamla adressen aktiv med permanent omdirigering (inklusive frågeparametrar, så `?highlight=…&lang=…` överlever).

## Teknisk not

- Ny `VITE_SITE_URL` (fallback = nuvarande publicerade adress) läses i `src/routes/index.tsx` och `src/routes/__root.tsx` för `og:url`, `canonical`, `og:image`, `twitter:image` och `hreflang`.
- `public/robots.txt` samt en sitemap-route under `src/routes/` som genererar `sitemap.xml` från samma värde.
- Inga databasändringar. `SpaceCard.tsx` behöver inget — den använder redan aktuell adress.
