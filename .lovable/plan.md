# Utredning: långsam laddning och publika databasanrop

## Vad jag har verifierat i koden

**1. Startsidans loader väntar på databasen innan sidan kan renderas.**
I `src/routes/index.tsx` gör `loader` fem `await`-anrop mot databasen innan HTML skickas:

```text
fetchOgImageUrl()                      -> app_settings (delningsbild)
fetchUiText("landing_title", "sv")     -> app_settings
fetchUiText("landing_title", "en")     -> app_settings   (samma rader som ovan)
fetchUiText("share_description", "sv") -> app_settings
fetchUiText("share_description", "en") -> app_settings   (samma rader som ovan)
```

Det här tillkom när delningsbild, rubrik och delningsbeskrivning gjordes redigerbara i admin — alltså precis i den period du pekar ut. Före det hade startsidan ingen blockerande loader.

Två följdproblem:
- `fetchUiText` hämtar redan både svensk och engelsk rad i ett anrop, så två av fyra anrop är rena dubbletter.
- Loaders i TanStack körs isomorft: samma fem anrop görs även i webbläsaren, inte bara på servern.
- Anropen går via webbläsarklienten (`@/integrations/supabase/client`) i stället för en serverfunktion, och de ligger inuti `try/catch` — misslyckas eller hänger de syns inget fel, sidan bara väntar.

**2. Många separata publika anrop vid första renderingen.**
Utöver lokaler, filteralternativ och filterkategorier gör varje inställningshook sin egen fråga mot `app_settings`: underhållsläge, beta-märke, driftsmeddelande, rubrik/ingress/brödtext (en fråga per textnyckel), dolda ikoner, platsikon, kortlayout, menylänkar och beläggningsinställningar. Det blir ett tiotal parallella publika anrop mot samma tabell vid varje sidladdning.

**3. Mätningar just nu (från byggmiljön)**
- Databasen svarar på ~0,1–0,18 s.
- `https://spacefinder.lib.kth.se/` svarar med första byte på ~0,6 s.
- Sidans `<title>` i produktion är den gamla ("Hitta studieplats på KTH Biblioteket"), inte den som ligger i admin. Det tyder på att den publicerade versionen är äldre än de senaste ändringarna, alternativt att loaderns databasanrop inte lyckas i produktionsmiljön.

## Vad som inte är bevisat

Jag kan inte återskapa 7-sekunderstimeouten härifrån. Sannolik förklaring är punkt 1 — en blockerande loader som väntar på databasen — men om anropen faktiskt timeoutar måste orsaken bekräftas (nätverksväg från publiceringsmiljön, saknade miljövariabler i produktionsbygget, eller att laddningen sker i webbläsaren och blockeras av nätverket hos KTH).

## Förslag till nästa steg (ingen kod ändrad än)

1. Bekräfta var timeouten uppstår: jämför serverns svarstid (curl mot sajten) med webbläsarens nätverkspanel på spacefinder-domänen, och notera vilket anrop som tar 7 s.
2. Slå ihop loaderns fem anrop till ett enda (en fråga mot `app_settings` som hämtar alla fyra nycklarna) och lägg det i en serverfunktion med kort timeout och fallback, så att sidan aldrig kan blockeras mer än någon sekund.
3. Samla övriga inställningsanrop till en gemensam "app-inställningar"-fråga i stället för en per hook.
4. Publicera om och verifiera att `<title>` och delningsbild i produktion matchar admin.

Säg till om du vill att jag genomför punkt 2–4.
