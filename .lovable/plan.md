## Tillgänglighetsgenomgång (WCAG 2.1 AA / Digg-riktlinjer)

Jag har gått igenom hela appen (publik vy, adminläge, kortkomponent, filterpanel, bildkarusell, lightbox, språkväxling, m.m.). Här är resultatet med förslag till åtgärder, indelat i tre nivåer. Du väljer hur långt vi går.

---

### 🔴 Kritiskt (WCAG A – bör fixas)

1. **Språkattribut är hårdkodat `lang="en"`** trots att standardspråket är svenska (`__root.tsx`). Skärmläsare uttalar då allt på engelska.
   → Sätt `lang="sv"` som default och uppdatera dynamiskt när användaren byter språk.

2. **Adminformuläret saknar kopplade etiketter** (`Field`-komponenten lägger `<label>` som syskon utan `htmlFor`/`id`). Drabbar ~25 inputfält (namn, våning, kapacitet, URL:er m.m.).
   → Bygg `Field` så att den genererar `id` och kopplar `label htmlFor`.

3. **Adminsidan saknar `<main>`-landmärke** → ingen "hoppa till innehåll" fungerar.
   → Wrappa adminlayouten i `<main>`.

4. **Bild-lightboxen hanterar inte fokus** – fokus flyttas inte in, fångas inte, och tab kan hamna bakom overlayen.
   → Flytta fokus till stängknappen vid öppning, fånga fokus inom dialogen, återställ vid stängning. Alternativt byt till shadcn `Dialog` (Radix sköter detta).

5. **Bulk-action-fälten i admin saknar etiketter** (tre `<select>` + textfält utan label/aria-label).
   → Lägg till `<label>` eller `aria-label`.

6. **Alt-textfälten för bilder i admin saknar label** – endast placeholder används.
   → Lägg till riktiga `<label>` per fält.

7. **Ingen "Hoppa till innehåll"-länk** på någon sida.
   → Lägg till en `sr-only`-länk i `__root.tsx` som blir synlig vid fokus.

---

### 🟡 Mellan (WCAG AA – tydliga förbättringar)

8. **Ikonknappar i admin använder `title` istället för `aria-label`** (redigera/ta bort/dra-handtag). `title` läses inte upp tillförlitligt.
9. **`DynamicCategoryField`-togglar saknar `aria-pressed`** så hjälpmedel inte kan avgöra valt läge.
10. **Hopfälld beskrivning på lokalkortet göms inte för skärmläsare** när den är kollapsad → använd `inert`/`hidden`. Lägg även `aria-controls`/`aria-expanded` på knappen.
11. **`<article>`-korten saknar tillgängligt namn** (`aria-labelledby` pekande på `<h3>`). Lägg också korten i en `<ul>` så antal annonseras.
12. **Hårdkodade färger** (`text-black`, `bg-[#FFF0B0]`, `bg-[#1954a6]`, `bg-gray-200`, `bg-white`) bryter designsystemet och kan ge dålig kontrast / brytas i mörkt läge. Byt mot semantiska tokens (`text-foreground`, `bg-card`, `bg-primary`, `bg-muted`).
13. **`min-h-screen` → `min-h-dvh`** i `__root.tsx`, `index.tsx`, `admin.tsx` för korrekt höjd på mobil med dynamisk webbläsarchrome.
14. **Karusell/lightbox-aria-labels är hårdkodade svenska** – flytta till i18n så engelska användare får engelska etiketter.
15. **Filterpanelen `<aside>` saknar `aria-label`** ("Filter").
16. **Karusellens punktindikatorer** – byt `aria-current={bool}` mot `aria-pressed` (eller använd `aria-current="true"` som sträng).
17. **Tap targets under 44×44 px** på admin-ikonknappar (`p-2` ger 32×32, drag-handles 24×24). Öka till `min-h-11 min-w-11` åtminstone på primära mobila ytor.
18. **`LanguageSwitcher`** visar bara "sv"/"en" – lägg till `<span className="sr-only">Svenska/English</span>` och `aria-label`.
19. **Settings-ikonlänken** till admin – sätt `aria-hidden="true"` på `<Settings>`-ikonen så texten inte dubbleras.

---

### 🔵 Småförbättringar (informativt)

20. **`<h1>` i headern är liten logotyp-text**; det stora sökresultatet är `<h2>`. Överväg att lyfta sidans rubrik till ett mer beskrivande `<h1>` (t.ex. "Hitta studieplats") och låta loggan vara vanlig text.
21. **404-sidan** – gör "Page not found" till `<h1>` istället för "404".
22. **Beskrivningens länkar** öppnas i ny flik utan "öppnas i nytt fönster"-annonsering. Lägg till `sr-only` markering i sanitizern.
23. **Icke-interaktiva chips** använder `title` som enda label – lägg in synlig text (redan finns) och ta bort onödigt `title`.

---

### Förslag på upplägg

Jag föreslår att vi i denna planimplementation gör **steg 1–7 (kritiskt)** + **steg 8–13, 17, 18 (de viktigaste AA-bristerna)**. Resten (14–16, 19–23) kan tas i en uppföljande omgång om du vill, eller ingå direkt. Säg till om du vill:

- **A.** Bara kritiska (1–7)
- **B.** Kritiska + viktiga AA (rekommenderas – 1–13, 17, 18)
- **C.** Allt ovan (1–23)

### Tekniska detaljer

- `Field`-fix: generera `useId()` i `Field`, klona `children` med `id`, eller exponera `htmlFor`+`id` per anrop.
- Lightbox: behåll nuvarande implementation men lägg till `useEffect` som flyttar fokus + `onKeyDown` Tab-loop, eller byt till `@/components/ui/dialog`.
- Skip-länk: i `__root.tsx` lägg `<a href="#main" className="sr-only focus:not-sr-only …">Hoppa till innehåll</a>` och `id="main"` på `<main>` i index.tsx/admin.tsx.
- Lang-uppdatering: lyssna på `i18n.on('languageChanged', l => document.documentElement.lang = l)` i `__root.tsx`.
- Tokens: ersätt `text-black` med `text-foreground`, `bg-white` med `bg-background`, hex-färger med semantiska klasser (eller lägg till nya tokens i `src/styles.css` om designen kräver dem).
