# Roadmapa: co zostało, żeby to zintegrować i wdrożyć

> **UWAGA (2026-07-17):** Punkty 1, 3, 4 w sekcji 2 niżej (Store Factory, dokumenty stron w repo
> sklepu, edytor w repo każdego sklepu) opisują decyzję z 2026-07-16, którą **właściciel od tamtej
> pory odrzucił**. Kanon aktualnej decyzji: `pawelekbyra/sklepik/docs/plans/storefront-composition-system.md`
> (jeden współdzielony storefront, layout jako dane, `/admin` jako trasa tej samej aplikacji, nie
> osobne repo per sklep). Reszta tego dokumentu (stan pakietów, blocker autoryzacji, punkty 2/5)
> pozostaje trafna — czytaj z tą jedną poprawką w pamięci.
>
> **Dokument dla następnego agenta.** Spisany 2026-07-16 na koniec sesji, w której powstały etapy
> 4–8, `component-library`, integration spike i tryb „własne repo". Celem jest, żebyś **nie
> odkrywał drugi raz** tego, co już wiadomo, i **nie podważał decyzji**, które właściciel już podjął —
> z zastrzeżeniem uwagi wyżej: decyzje właściciela mogą się zmieniać, zawsze sprawdzaj `sklepik`
> jako kanon, jeśli coś tu wygląda na nieaktualne.
>
> Kolejność czytania: ten plik → [`ARCHITEKTURA.md`](ARCHITEKTURA.md) (decyzje + uzasadnienia) →
> [`MACIERZ_ZGODNOSCI.md`](MACIERZ_ZGODNOSCI.md) (status funkcja po funkcji).

## 1. Gdzie to realnie jest

**Działa i jest zweryfikowane w przeglądarce — ale w izolacji.** `apps/editor` edytuje
`apps/storefront-demo`. Obie to aplikacje demo w tym repo. **Ani `sklepik`, ani `sklepikFront` nie
zostały tknięte.** Zero integracji z czymkolwiek produkcyjnym.

Gotowe: `schema`, `editor-core` (komendy + undo/redo), `persistence` (SQLite / File / GitHub),
`renderer`, `component-library` (7 z 14 sekcji treści), canvas z drag&drop, dodawanie/usuwanie
sekcji, panel właściwości generowany z Zod, tryb Podgląd, zapis dokumentu.
115 testów, typecheck czysty w 7 pakietach.

Trzy warstwy, trzy różne stany — nie myl ich:

| Warstwa | Stan |
|---|---|
| Zakładanie sklepu (repo + Vercel) — kod w `sklepik` | napisane, **nigdy nie uruchomione** (wg `store-factory.md`: „całkowicie nieprzetestowane end-to-end"). Drugi sklep nigdy nie powstał |
| Edytor stron | zbudowany i zweryfikowany, **czeka na podłączenie** |
| Autoryzacja (kto może edytować) | **nie istnieje** — nie ma czego podłączać |

## 2. Decyzje właściciela — NIE podważaj ich bez rozmowy

Stan z 2026-07-16, **zaktualizowany 2026-07-17** (patrz uwaga na górze dokumentu i kanon w
`sklepik/docs/plans/storefront-composition-system.md`):

1. ~~Edytor trafia do każdego nowego sklepu ze Store Factory.~~ **ODRZUCONE 2026-07-17.** Store
   Factory (repo+Vercel per sklep) jest porzucone. Edytor trafia do jednej, współdzielonej aplikacji
   wielosklepowej (`sklepikFront`), montowany jako `/admin`.
2. **Custom code bez pełnego sandboxa server-side, ale nie "bez ograniczeń".** W nowym modelu
   (jeden współdzielony runtime, nie osobne repo klienta) custom code klienta wykonuje się wyłącznie
   client-side, w `<iframe sandbox="allow-scripts">` ze ścisłym CSP — bo teraz dzieli infrastrukturę
   z innymi sklepami, nie ma własnego izolowanego deploymentu. Warunkowa logika (widoczność, reguły)
   przez JSON-Logic, zero wykonania kodu. Pełne uzasadnienie: `storefront-composition-system.md`.
3. ~~Dokumenty stron żyją w repo sklepu (opcja A, git-based CMS).~~ **ODRZUCONE 2026-07-17.**
   Dokumenty stron żyją w bazie `sklepik`, scoped po `store_id` (nowa implementacja `PageRepository`,
   nie `GitHubPageRepository` — ta ostatnia zostaje jako legacy/opcja referencyjna). Backend commerce
   `sklepik` jest **zawsze**, niezależnie od tego — to się nie zmieniło.
4. ~~Edytor mieszka jako trasa `/admin` w repo każdego sklepu.~~ **ODRZUCONE w części "repo każdego
   sklepu" 2026-07-17** — patrz `ARCHITEKTURA.md` dla pełnej noty. Argument rozstrzygający (centralny
   edytor nie ma czym wyrenderować sekcji customowych, bo rejestr jest per-runtime) **nadal
   obowiązuje**, ale rozwiązaniem jest teraz jeden współdzielony runtime obsługujący wiele sklepów,
   nie N runtime'ów (po jednym na sklep). Auth: zwykła sesja przeciw `sklepik`, nie federacyjny JWT/JWKS.
5. **Podział treść/commerce**: sekcje treści w `component-library`, sekcje commerce to slot rejestru
   wypełniany przez host (storefront ma warstwę danych, biblioteka nie). **Nadal aktualne** — badawczo
   zwalidowane jako zgodne z Shopify Online Store 2.0 (dynamic sources).

## 3. BLOCKER: autoryzacja

**Edytor nie ma żadnej autoryzacji.** Brak logowania, sesji, `middleware.ts`. Server Action
`savePage` waliduje *kształt* dokumentu, ale nie sprawdza **kto** go wysyła:

```ts
export async function savePage(page: Page) {
  const parsed = PageSchema.parse(page);   // sprawdza CO
  await pages.update(...);                 // nie sprawdza KTO
}
```

Na `localhost` nieszkodliwe. Ale „zero autoryzacji" + „token GitHuba z prawem zapisu do repo sklepu
w env" = **tego nie wolno nigdzie wystawić w obecnej postaci**. To nie jest dziś podatność (nic nie
jest wdrożone) — to warunek blokujący wdrożenie i pierwsza rzecz do zrobienia.

Czego NIE trzeba wymyślać: `sklepik` ma użytkowników i role per sklep (`multi-store-support.md`
Faza 1, CanCanCan). Zadanie to „posadź `/admin` za istniejącą autoryzacją i sprawdź prawa do tego
`store_id`", nie „zaprojektuj autoryzację".

## 4. Kolejność prac

Numeracja etapów 9–12 pochodzi z [`INSTRUKCJA_INTEGRACJI.md`](INSTRUKCJA_INTEGRACJI.md) i jest
zachowana, ale **kolejność niżej jest ważniejsza niż tamte numery**.

1. **Autoryzacja `/admin` + SSO z panelu** — blokuje wszystko inne, bo bez tego nic nie wyjdzie
   poza localhost.
2. ~~Przepakowanie `apps/editor` → `@sklepik/page-builder`~~ **ZROBIONE, ale inaczej niż tu opisano
   (2026-07-17):** pakiety publikowalne noszą `@pawelekbyra/*` (GitHub Packages wymaga zgodności
   scope'u z prawdziwym właścicielem repo — `pawelekbyra`, nie organizacja `sklepik`). Infrastruktura
   publikacji (Changesets, `.github/workflows/release.yml`) gotowa; `apps/editor` jako całość wciąż
   nie jest przepakowany do montażu jako `/admin` w `sklepikFront` — to zostaje.
3. **Pierwsze realne uruchomienie `GitHubPageRepository`** — kod i testy (na mocku) są, ale **nigdy
   nie dotknął prawdziwego GitHuba**. Wymaga tokena i repo sklepu = konfiguracja właściciela.
   Spodziewane tarcia: uprawnienia fine-grained tokena, nazwa gałęzi, ścieżka `content/`.
   Do czasu tego uruchomienia traktuj jak niezweryfikowane (dokładnie jak provisioning w
   `store-factory.md`).
4. **Front C — storefront renderuje dokumenty.** `apps/storefront-demo` to **działający wzorzec do
   przeniesienia**, nie szkic. Dziś `sklepikFront` renderuje ręcznie kodowanymi trasami Next.js.
5. **Reszta do „10/10"** (kolejność swobodna):
   - `component-library`: brakuje `Header`, `Footer`, `Testimonials`, `Video`, `Columns`, `Image`,
     `Navigation` (7 z 14 gotowych),
   - **pola-tablice w panelu właściwości** (`faq.items`, `testimonials.items`) — dziś
     `kind: 'unsupported'` w `fieldsFromSchema.ts`; wymagają UI z powtarzalnymi polami,
   - **UI dla bloków** — `MoveBlockCommand`/`UpdateBlockCommand` gotowe i przetestowane, brak UI
     (seed nie ma bloków, więc nie było czego pokazać),
   - **poszerzyć typy renderera o async server components** — `SectionComponent` to
     `ComponentType`, które nie obejmuje async; każdy host musi rzutować (patrz
     `apps/storefront-demo/src/lib/sections.tsx`),
   - Etap 10 (media), Etap 11 (motywy) — repozytoria gotowe, brak UI,
   - `duplicate()` na Page/Theme, `PersistenceBootstrap.createStore()` — planowane,
   - Etap 12: E2E Playwright.

### Etap 9 (draft/publish) — przemyśl zakres, nie kopiuj

`VersionRepository` (draft/publish/historia, transakcyjnie) jest gotowy i przetestowany od Etapu 4 —
brakuje wyłącznie spięcia z UI. **Ale**: w trybie „własne repo" historię wersji daje już git, a
publikacja to commit. Zanim odtworzysz railsowy model draft/publish, zapytaj, czy nie duplikujesz
tego, co daje git. To realne pytanie projektowe, nie formalność.

## 5. Pułapki środowiskowe — to już kosztowało czas

- **`better-sqlite3` nie zbuduje się** na tej maszynie (wymaga node-gyp + MSVC, brak Visual Studio
  Build Tools). Używamy wbudowanego **`node:sqlite`**. Nie wracaj do `better-sqlite3`.
- **Vite/Vitest nie zna `node:sqlite`** jako builtinu (`builtinModules` go nie zawiera — moduł
  eksperymentalny), strippuje prefiks `node:` i wywala się na „sqlite". Obejście: `createRequire`
  w `packages/persistence/src/sqlite/db.ts`. Nie „upraszczaj" tego z powrotem do zwykłego importu.
- **Next.js + webpack a pakiety workspace**: wymagane `transpilePackages` (webpack nie przetwarza TS
  w `node_modules`, gdzie pnpm linkuje workspace) **i** `resolve.extensionAlias` (webpack nie mapuje
  `./Foo.js` na `./Foo.ts`, w przeciwieństwie do `tsc`/Vitest). Oba w `next.config.ts` obu aplikacji.
- **`SectionErrorBoundary` musi mieć `'use client'`.** Error boundary musi być klasą, klasy działają
  tylko w Client Components — bez tego **całego renderera nie da się zaimportować do Server
  Component** i storefront się nie zbuduje. To był realny blocker Frontu C.
- **Komponenty `component-library`: żadnych handlerów zdarzeń i żadnego `'use client'`** — muszą
  działać jako Server Components (storefront) i w drzewie klienta (canvas). Różnice edit/live rób
  deklaratywnie przez prop `mode` (np. `<a href>` na żywo vs inertny `<span>` na canvasie).
- **`@dnd-kit` + SSR = hydration mismatch** (generuje niestabilne `aria-describedby`). Obejście:
  `DndContext` renderowany dopiero po zamontowaniu (`Canvas.tsx`).
- **Testing Library nie sprząta sama** (vitest bez `globals`) — bez jawnego `afterEach(cleanup)`
  rendery kumulują się w `document.body` i `getByText` znajduje duplikaty.
- **`sharp` odrzucony** w `pnpm-workspace.yaml` (natywny build, `next/image` nieużywane).
- **Dev server cachuje nieudane rozwiązanie modułu** — po dodaniu zależności workspace **zrestartuj
  go**, inaczej zobaczysz „Module not found" mimo poprawnego `pnpm install`.
- **`.env` jest gitignorowany od 2026-07-16** (wcześniej **nie był** — a tryb „własne repo" prosi
  o token GitHuba). `.env.example` zostaje commitowany.

## 6. Otwarte pytania — to decyzje właściciela, nie Twoje

- **Gdzie żyją media/obrazy w trybie „własne repo"?** `MediaRepository` trzyma dziś tylko metadane,
  bez realnego storage. Repo sklepu? Vercel Blob? Coś centralnego? Nierozstrzygnięte, a blokuje
  Etap 10.
- **Czy `managed` w ogóle powstanie?** Wg `store-factory.md` to otwarte pytanie. Jeśli nie —
  „Front A" (tabele i endpointy stron w `sklepik`) oraz `SklepikPageRepository` nie mają po co
  istnieć, a `INSTRUKCJA_INTEGRACJI.md` §1–4 zostaje wyłącznie materiałem historycznym.
- **Governance repozytoriów** (z `store-factory.md`): zostają w organizacji platformy czy transfer
  do klienta?
- Model cenowy warstw izolacji.

## 7. Zasady pracy w tym repo

- Po każdej zmianie: `pnpm -r test` i `pnpm -r typecheck` (oba muszą przechodzić).
- Zmiany widoczne w przeglądarce **weryfikuj w przeglądarce**, nie tylko testami — spike wykrył
  blocker (`'use client'`), którego żaden test jednostkowy by nie złapał.
- Dokumentację aktualizuj razem z kodem: `MACIERZ_ZGODNOSCI.md` (status per funkcja),
  `ARCHITEKTURA.md` (decyzje). Rozjazd docs↔kod już raz kosztował — patrz gałąź
  `agent/fix-typescript-documentation` (10 commitów opisujących stan sprzed Etapu 4; **nie merguj
  jej**, wartościowe rzeczy z niej już cherry-pickowane).
- **Nie commituj do cudzych repo** (sklep, `sklepikFront`) bez wyraźnej zgody właściciela — to
  zmiana wychodząca na zewnątrz.
