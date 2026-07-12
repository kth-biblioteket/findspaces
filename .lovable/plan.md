# Förslag: snygga till adminläget

Fokus på lokal-översikten (som du tycker känns rörig) plus några övergripande grepp som lyfter hela admin. Inga funktioner tas bort – bara omgruppering, tydligare visuell hierarki och mindre "chip-sallad".

## 1. Lokal-översikten (tabellen)

Idag ligger allt på en rad: checkbox, drag-handtag, namn, kategori, slug, våning, lokaltyp, ljudnivå + en rad små badges (SV/EN·SV/EN·SV/EN·SV/EN·SV/EN·SV/EN + studieplatser + nedslag + datorer + foton) + två actions. På 1266 px blir det trångt.

**Byt tabellen mot en kortlista** (en rad = ett kort):

```text
┌──────────────────────────────────────────────────────────────────┐
│ ⋮⋮ ☐  [Studieplats]  Maxwell                                🖉 🗑 │
│      Plan 3 · Norra Arkaden · slug: maxwell                       │
│      Lokaltyp: Grupprum, Datorsal   Ljud: Tyst                    │
│      Innehåll:  📝Info SV·EN  📍Karta SV  📅Bokning SV·EN  🖼 4    │
│      Platser:   🪑 24 studie   🛋 6 nedslag   🖥 8 dator          │
└──────────────────────────────────────────────────────────────────┘
```

Konkret:
- Kategori som färgad "pill" längst upp till vänster (blå = studie, grön = service, lila = skapande) – ersätter dagens textkolumn.
- Namn stort och fetstilt; metarad (plan, byggnad, slug) i muted text under.
- Två grupperade rader: **Innehåll** (texter/länkar/foton) och **Platser** (studie/nedslag/dator).
- Redigera/Ta bort som stora ikon-knappar längst till höger, alltid på samma plats.
- Behåll drag-handtag och checkbox till vänster, men lägre visuell tyngd (mindre grå).

Vinsten: samma information, men ögat får en tydlig läsordning istället för en radda små chips.

## 2. Chips – lugna ner färgpaletten

Idag är nästan varje chip blå (`bg-primary/15`). Det gör att ögat inte kan skilja "innehåll" från "platser". Förslag:
- **Innehåll (texter/länkar/foton)**: neutral grå chip, blå bara när något saknas på EN och det är värt att flagga.
- **SV-only**-flaggan behålls i amber (varning) – den är faktiskt informativ.
- **Platser** (studie/nedslag/dator): behåll blåa chips men bara i platser-raden – då blir de en egen visuell grupp.
- **Foton**: liten bild-ikon i innehållsraden istället för egen färgad chip.

## 3. Header + flikar

- Öka rubrikens tyngd: "Admin — Studieplatser" är idag `text-sm`. Höj till `text-base font-semibold` och lägg en liten bygg-/miljöindikator (t.ex. "Preview" / "Live") till höger så man vet var man är.
- Flikarna: byt ordning till en mer logisk gruppering – **Lokaler · Filter · Texter · Kortlayout · Beläggning · Statistik** (innehåll före utseende före drift).
- Aktiv flik med underlinje i KTH-blått istället för default shadcn-stilen, så det matchar studentvyn.

## 4. Redigera-dialogen ("Ny/Redigera lokal")

Idag är den en lång vertikal lista med ~30 fält. Gör den till en dialog med interna flikar:

- **Grundinfo**: typ, namn (SV/EN), slug, våning, byggnad
- **Innehåll**: beskrivning (SV/EN), info-text, notis
- **Länkar**: karta, bokning, grupprum, "boka nu" (SV/EN)
- **Kapacitet & utrustning**: studieplatser, nedslag, datorer, taggar
- **Bilder**: uppladdning + alt-texter

Samma fält, men bara 5–6 synliga åt gången. Hjälptexterna (som du lade in för länksyntax) blir mycket lättare att hitta när fälten inte drunknar.

## 5. Små konsekventa detaljer

- Använd samma "pill"-form och samma spacing överallt (`rounded-full`, `px-2.5 py-1`, `text-xs`).
- Säkerställ att alla "spara"/"avbryt"-knappar har samma ordning (avbryt vänster, spara höger, primär färg på spara).
- Töm-tillstånd: när ingen lokal matchar sökningen, visa en illustrerad tom ruta istället för en tom tabell.
- Sticky-header på lokal-listan så du ser kolumnrubriker när du scrollar.

## Teknisk not

Alla ändringar bor i `src/routes/admin.tsx` + möjligen en ny liten komponent `AdminSpaceCard.tsx` för kortraden. Inga databasändringar, inga API-ändringar, inga ändringar i studentvyn. Färger tas från befintliga design-tokens i `src/styles.css` (`--kth-blue`, `--kth-navy`, `--primary`, `--muted`) – inga hårdkodade hex.

---

Vill du att jag kör hela paketet, eller ska vi börja med bara **§1 + §2** (kortlistan + lugnare chips) som ger störst visuell effekt direkt?
