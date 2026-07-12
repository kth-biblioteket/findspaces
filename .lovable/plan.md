## Mål
Snygga till lokalkorten i admin så de blir lättare att skanna, flytta kategorietiketten till efter titeln, och uppdatera texter så de matchar dagens studievy (där "Jag vill arbeta" inte längre finns).

## 1. Ny layout på lokalkortet (SortableSpaceRow)

Idag: kategori-pill står **före** titeln på översta raden. Meta-raden nedanför blandar plan, byggnad, lokaltyp, ljud och slug i en lång rad prickar.

Ny ordning på översta raden:

```text
⋮⋮ ☐   Maxwell  [Studieplats]                                    🖉  🗑
       Plan 3 · Norra Arkaden · slug: maxwell
       [Grupprum] [Datorsal]   [Tyst]
       Innehåll: ...    Platser: ...
```

Konkret:
- **Titeln först**, kategori-pill (Studieplats / Service & faciliteter / Skapande & paus) direkt efter namnet, samma färgkodning som idag men lite mindre visuell tyngd (behåll pill-formen).
- **Meta-rad 1** (muted, `text-xs`): endast plan · byggnad · slug. Lokaltyp och ljudnivå flyttas till en egen rad.
- **Meta-rad 2**: lokaltyps-chip (neutrala grå pills) + separat ljudnivå-chip. Blir en tydlig visuell grupp för "vad är det här för lokal".
- **Innehåll/Platser** (befintlig `ContentBadges`): oförändrad.
- Slug visas alltid; "ingen slug" kursivt när saknas – oförändrat men flyttar in i meta-rad 1.

## 2. Uppdaterade texter i redigera-dialogen

Studievyn använder inte längre "Jag vill arbeta". Ändra i `Field label`:
- **"Arbetssätt (vilka val i 'Jag vill arbeta' som lokalen passar)"** → **"Arbetssätt (matchar filtret 'Hur vill du arbeta?' i studievyn)"**

Detta är hjälptexten i redigera-dialogen (rad 872). Alternativen (Enskilt / Tillsammans / I grupprum) står kvar oförändrade eftersom de fortfarande används av filtret.

## 3. Små konsekventa detaljer

- Byt "Studieplats"-pill till "Studieplatser" (så att den matchar den nya rubriken "Alla lokaler/ytor" och studievyns språk).
- Konsekventa pill-mått överallt: `rounded-full px-2 py-0.5 text-[11px]`.
- Ljudnivå-chippen får en subtilt annorlunda stil (border + `text-muted-foreground`) så man snabbt ser att det är metadata, inte en kategori.

## Teknisk not

Alla ändringar bor i `src/routes/admin.tsx`:
- `SortableSpaceRow` (rad 2135–2255): flytta pill, dela upp meta i två rader.
- `Field label` för Arbetssätt (rad 872): byt hjälptext.
- `kindMeta.label` för `study` (rad 2157): "Studieplats" → "Studieplatser".

Inga databasändringar, ingen ändring i studentvyn, inga nya komponenter.