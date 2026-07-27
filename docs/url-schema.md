# URL-schema — Hitta studieplats

Startsidan (`/`) speglar hela filter- och sorteringstillståndet i query-strängen. Det gör varje kombination delbar som direktlänk — t.ex. från KTH-sidan som bäddar in appen, eller från kollegor som vill peka på "grupprum, 5+, ledigt just nu".

All parsning sker i `validateSearch` i `src/routes/index.tsx`. Okända värden ignoreras tyst — länken går aldrig sönder, men okänd data droppas.

## Parametrar

| Param | Typ | Värden | Beskrivning |
|---|---|---|---|
| `q` | string | fri text | Sökterm som matchas mot lokalens namn. Tom sträng = ingen sökning. |
| `kind` | string | `service`, `creative`, … | Vilken typ av lokal. `study` är default och skrivs **aldrig** i URL:en. |
| `mode` | string | `enskilt`, `tillsammans`, `grupprum` | Hur användaren vill arbeta. Endast relevant när `kind` saknas (dvs. `study`). |
| `size` | enum | `2-4`, `5+` | Gruppstorlek. Endast relevant när `mode=grupprum`. |
| `free` | boolean | `1` / true | Visa bara grupprum som är lediga just nu. Endast med `mode=grupprum`. |
| `cats` | objekt | `{ "categorySlug": ["optionSlug", …] }` | Valda filteralternativ per kategori. URL-kodas som JSON-liknande objekt av TanStack Router. |
| `sort` | enum | se nedan | Aktiv sortering. `recommended` är default och skrivs **aldrig** i URL:en. |
| `highlight` | string | space-id eller slug | Pulserar/scrollar till angiven lokal vid inladdning. Sätts av "Visa på karta"-länkar mellan lokaler. |

### Giltiga `sort`-värden

- `recommended` (default, utelämnas i URL)
- `seats_desc` / `seats_asc` — kräver `kind=study` (implicit)
- `floor_asc` / `floor_desc`
- `name_asc` / `name_desc`
- `free_now` — kräver `mode=grupprum`

Ogiltiga kombinationer (t.ex. `sort=free_now` utan `mode=grupprum`) faller automatiskt tillbaka till `recommended` utan att kasta.

## Exempel

```
/                                          # startvy, alla studieplatser
/?q=maxwell                                # sök på "maxwell"
/?mode=grupprum&size=5%2B&free=1           # stora grupprum lediga just nu
/?mode=grupprum&size=5%2B&sort=free_now    # samma, men sorterat på lediga först
/?kind=service                             # service & faciliteter
/?cats=%7B%22utrustning%22%3A%5B%22whiteboard%22%5D%7D   # cats={"utrustning":["whiteboard"]}
/?highlight=maxwell                        # scrolla + pulsera Maxwell-kortet
```

## Konventioner

- **Defaultvärden skrivs aldrig i URL:en.** `kind=study`, `sort=recommended`, tomt `q`, tom `cats` etc. utelämnas så att baseline-länken alltid är `/`.
- **Byten är `replace: true`.** Filter- och sorterings-updates ersätter historian istället för att pusha, så webbläsarens bakåt-knapp bär tillbaka till föregående *sida*, inte till varje filtertryck.
- **Persistens över filterbyten.** Aktiv `sort` behålls när användaren byter filter så länge sorteringen fortfarande är giltig (t.ex. `sort=free_now` nollställs om `mode` inte längre är `grupprum`).

## För kth.se-embed

När appen bäddas som iframe på kth.se är URL-ändringarna **interna för iframen** — de syns inte i parentens adressfält. Om KTH-sidan vill kunna dela djuplänkar behövs en `postMessage`-brygga som synkar iframens `location.search` till parent (inte implementerat i skrivande stund — se `.lovable/plan.md` sektion 1).

Fram tills dess: användare som ska dela en specifik vy delar direktlänken till appens egen domän (`lib.kth.se/…`), inte kth.se-URL:en.
