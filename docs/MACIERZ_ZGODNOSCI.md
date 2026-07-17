# Macierz zgodności funkcjonalnej: nowy edytor (TypeScript) → starsze odpowiedniki

> Stan na start rewrite'u: **wszystko `planowane`**. Dokument jest żywy — po każdym etapie z
> [`docs/ARCHITEKTURA.md`](ARCHITEKTURA.md) odpowiednie wiersze przechodzą
> `planowane` → `zaimplementowane` → `przetestowane`.

Legenda: `planowane` · `zaimplementowane` · `przetestowane`.

## 1. Model danych i workflow (funkcje przekrojowe)

| Funkcja | Odpowiednik w nowej architekturze | Status | Test |
|---|---|---|---|
| Hierarchia Store→Theme→Page→Section→Block→Link | `packages/schema`: `PageSchema`, `ThemeSchema`, `SectionSchema`, `BlockSchema` | przetestowane | `packages/schema/test/page.test.ts` |
| STI (pole `type` jako dyskryminator) | Zod discriminated union | przetestowane | `packages/schema/test/{section,block,page}.test.ts` |
| Rejestr rozszerzalności typów | `packages/renderer` component registry (`registerSection`/`registerBlock`) | przetestowane | `packages/renderer/test/registry.test.tsx` |
| Custom code / dystrybucja managed vs własne repo | Decyzja 2026-07-16: w trybie „własne repo" właściciel woła `registerSection()` bez sandboxa (pełny dostęp do repo); w trybie `managed` woła tylko platforma. Zob. `ARCHITEKTURA.md` § „Dystrybucja". | zdecydowane (projekt), implementacja planowana | |
| Gdzie żyją dokumenty stron | **Decyzja właściciela 2026-07-17 (kanon): „współdzielony storefront"** — dokument w bazie `sklepik`, scoped po `store_id`, przez `SklepikPageRepository` konsumujący Admin API (`Spree::StorefrontPage`, singleton homepage per sklep, draft/publish, optimistic locking). `GitHubPageRepository`/`FilePageRepository` (poprzednia decyzja 2026-07-16, „własne repo") zostają jako legacy/materiał referencyjny. Zob. `sklepik/docs/plans/storefront-composition-system.md`. | `SklepikPageRepository` przetestowana jednostkowo (mock fetch), **nigdy nie uruchomiona przeciw prawdziwemu backendowi**; celowo ograniczona do jednej strony głównej per sklep (Rails nie ma jeszcze ogólnego CRUD wielostronicowego — otwarte pytanie w kanonie) | `packages/persistence/test/sklepik-page-repository.test.ts` |
| Zapis zmian z edytora | Przycisk „💾 Zapisz" → Server Action `savePage` (rewalidacja `PageSchema` na granicy sieci) → `PageRepository` | przetestowane (zweryfikowane w przeglądarce: edycja → zapis → plik na dysku → storefront pokazuje zmianę) | |
| Konflikt równoległej edycji | `GitHubPageRepository` wysyła `sha` bieżącego bloba — GitHub odrzuca nieaktualny zapis zamiast cicho nadpisać cudzy commit; błąd jest podnoszony, nie ponawiany | przetestowane | `github-page-repository.test.ts` |
| Preferencje jako płaskie skalary | pola w schema per typ, z `.default()` | przetestowane | `packages/schema/test/section.test.ts` |
| Rich text (ActionText) | pole `html: string` w schema | planowane | |
| Assety (obraz sekcji, screenshot) | `MediaRepository` (SQLite demo) zwraca `{id, url}`; schema trzyma `assetId` | przetestowane | `packages/persistence/test/media-repository.test.ts` |
| Preview = duplikat, nie wersja | `PageVersionSchema` + `SQLiteVersionRepository.saveDraft()` | przetestowane | `packages/persistence/test/version-repository.test.ts` |
| Publish = transakcyjna podmiana | `VersionRepository.publish(pageId)` — transakcja SQL (`node:sqlite` `BEGIN/COMMIT/ROLLBACK`) | przetestowane | `packages/persistence/test/version-repository.test.ts` |
| Duplikowanie motywu/strony | `PageRepository.duplicate()` / `ThemeRepository.duplicate()` | planowane | |
| Reorder sekcji/bloków | `editor-core`: `MoveSectionCommand`/`MoveBlockCommand` (`packages/editor-core`, nie miał numeru etapu w `INSTRUKCJA_INTEGRACJI.md`, ale jest twardym prerequisite Etapu 6) + `@dnd-kit` w `apps/editor` | przetestowane | `packages/editor-core/test/move-{section,block}-command.test.ts` + zweryfikowane w przeglądarce (`apps/editor`) |
| Undo/redo | `editor-core` command stack (`CommandStack.undo()/redo()`) opakowany hookiem `useEditorStore` w `apps/editor` | przetestowane | `packages/editor-core/test/command-stack.test.ts` + zweryfikowane w przeglądarce |
| Historia zmian | `VersionRepository.listVersions(pageId)` | przetestowane | `packages/persistence/test/version-repository.test.ts` |
| Izolacja między sklepami | `storeId` wymagane pole w każdym repozytorium SQLite (Page/Theme/Version/Media) | przetestowane | `packages/persistence/test/store-isolation.test.ts` |
| Domyślny motyw po utworzeniu | `PersistenceBootstrap.createStore()` (bootstrap planowany; leżący pod spodem prymityw `ThemeRepository.setDefault()` już gotowy) | planowane | `packages/persistence/test/theme-repository.test.ts` (setDefault) |
| Allowlist typów (bezpieczeństwo) | walidacja Zod odrzuca nieznany `type` | przetestowane | `packages/schema/test/` |

## 2. Typy stron (15)

| Typ | Rola | Odpowiednik nowy | Status |
|---|---|---|---|
| Homepage | strona główna | `PageType: "homepage"` | planowane |
| Custom | dowolna strona | `PageType: "custom"` | planowane |
| ProductDetails | PDP | `PageType: "product-details"` | planowane |
| Taxon | strona kategorii | `PageType: "taxon"` | planowane |
| TaxonList | lista kategorii | `PageType: "taxon-list"` | planowane |
| ShopAll | wszystkie produkty | `PageType: "shop-all"` | planowane |
| SearchResults | wyniki wyszukiwania | `PageType: "search-results"` | planowane |
| Cart | koszyk | `PageType: "cart"` (layout + demo) | planowane |
| Checkout | checkout | `PageType: "checkout"` | planowane |
| Wishlist | lista życzeń | `PageType: "wishlist"` | planowane |
| Account | panel konta | `PageType: "account"` | planowane |
| Login | logowanie | `PageType: "login"` | planowane |
| Password | "coming soon" | `PageType: "password"` | planowane |
| Post | wpis blogowy | `PageType: "post"` | planowane |
| PostList | lista wpisów | `PageType: "post-list"` | planowane |

## 3. Typy sekcji (16 w nowej bibliotece)

Wszystkie 16 typów mają **schemat** w `packages/schema` (przetestowany). Kolumna „Komponent"
dotyczy `packages/component-library`. Sekcje **commerce** świadomie nie mają komponentu w bibliotece
— dostarcza go host (patrz `ARCHITEKTURA.md`, „Podział sekcji: treść vs commerce").

| Typ nowy | Rola | Schema | Komponent |
|---|---|---|---|
| Hero | baner główny | przetestowane | przetestowane (`component-library`) |
| Header | nagłówek | przetestowane | planowane |
| Footer | stopka | przetestowane | planowane |
| ProductGrid | siatka produktów | przetestowane | **slot hosta** — statyczny podgląd w `apps/editor`, realna implementacja (async RSC + dane) w `apps/storefront-demo` |
| CategoryGrid | siatka kategorii | przetestowane | **slot hosta** — planowane |
| ImageBanner | baner z obrazem | przetestowane | przetestowane (`component-library`) |
| RichText | tekst sformatowany | przetestowane | przetestowane (`component-library`) |
| Newsletter | newsletter | przetestowane | przetestowane (`component-library`) |
| Testimonials | opinie | przetestowane | planowane |
| FAQ | FAQ | przetestowane | przetestowane (`component-library`) |
| Video | wideo | przetestowane | planowane |
| Spacer | odstęp | przetestowane | przetestowane (`component-library`) |
| Columns | kolumny | przetestowane | planowane |
| Button | przycisk | przetestowane | przetestowane (`component-library`) |
| Image | obraz | przetestowane | planowane |
| Navigation | nawigacja | przetestowane | planowane |

## 4. Typy bloków (4 w nowej bibliotece)

| Typ nowy | Rola | Status |
|---|---|---|
| Button | przycisk CTA | planowane |
| Image | obraz w sekcji | planowane |
| RichText | tekst w sekcji | planowane |
| Navigation | link nawigacyjny | planowane |

## 5. Kontrolery / trasy admina → komendy edytora

| Operacja | Odpowiednik nowy | Status |
|---|---|---|
| Utwórz/edytuj/usuń temat | `ThemeRepository` CRUD | planowane |
| Utwórz/edytuj/usuń stronę | `PageRepository` CRUD | planowane |
| Dodaj sekcję | `AddSectionCommand` + paleta w `apps/editor` (fabryka `createSection` sieje domyślne wartości per typ) | przetestowane (jednostkowo + w przeglądarce) |
| Edytuj sekcję | `UpdateSectionCommand` — merge-patch preferencji, undo-able, panel właściwości w `apps/editor` (Etap 7) | przetestowane (jednostkowo + w przeglądarce) |
| Usuń sekcję | `DeleteSectionCommand` (undo przywraca na oryginalny indeks) + przycisk 🗑 w canvasie | przetestowane (jednostkowo + w przeglądarce) |
| Przesuń sekcję | `MoveSectionCommand` (undo-able) + `@dnd-kit` w `apps/editor` (Etap 6) | przetestowane (jednostkowo + w przeglądarce) |
| Przywróć ustawienia do domyślnych | `RestoreSectionDefaultsCommand` | planowane |
| Analogicznie dla bloków | `MoveBlockCommand`/`UpdateBlockCommand` gotowe i przetestowane jednostkowo (brak jeszcze UI w `apps/editor` — nie ma bloków w seed data ani `component-library` do zademonstrowania); `Add/DeleteBlockCommand` planowane | częściowo przetestowane |
| Opublikuj temat+strona | `PublishThemeCommand`, `PublishPageCommand` | planowane |
| Powiel temat/stronę | `DuplicateThemeCommand`, `DuplicatePageCommand` | planowane |

## 6. Renderowanie

| Funkcja | Odpowiednik nowy | Status |
|---|---|---|
| `render_page(page)` | `renderPage(page, { mode })` w `packages/renderer` (sortuje sekcje po `position`) | przetestowane (`render-page.test.tsx`) |
| `render_section(section)` — 3 tryby | `renderSection(section, { mode: "edit"/"live"/"lazy" })` — i symetrycznie `renderBlock(block, { mode })` dla bloków zagnieżdżonych w sekcjach | przetestowane (`render-section.test.tsx`, `render-block.test.tsx`) |
| Konwersja type → component | component registry w `packages/renderer` (`registerSection`/`registerBlock`) | przetestowane (`registry.test.tsx`) |
| Preferencje → CSS inline | `sectionStyles()`/`blockStyles()` w `packages/renderer` | przetestowane (`styles.test.ts`) |
| Tryb edycji vs. publiczny | prop `mode: "edit" | "live" | "lazy"` do renderera; komponenty `component-library` realnie się po nim różnią (`<a href>` na żywo vs inertny `<span>`) | przetestowane (`render-section.test.tsx`, `component-library/test/sections.test.tsx`) |
| Error boundary per-sekcja | `SectionErrorBoundary` w `packages/renderer` — nieznany typ renderuje czytelny fallback zamiast crashować, rzucający komponent też. Oznaczony `'use client'`, żeby renderer dał się zaimportować do Server Component (znalezisko spike'a — patrz `ARCHITEKTURA.md`) | przetestowane (`render-section.test.tsx`) |
| Wspólny renderer edytor ↔ storefront | `apps/storefront-demo` renderuje ten sam dokument tym samym `renderPage` + `component-library` co canvas edytora | przetestowane (zweryfikowane w przeglądarce, obie aplikacje) |

## Status implementacji etapami

- **Etap 1–3**: Audyt, dokumentacja, scaffolding, `packages/schema` ✅
- **Etap 4**: Persistence i wersjonowanie — interfejsy + `node:sqlite` demo ✅
  (`PageRepository`, `ThemeRepository`, `VersionRepository`, `MediaRepository`, `DemoCommerceProvider`;
  45 testów łącznie w `packages/schema`+`packages/persistence`). Poza zakresem tego etapu:
  `duplicate()` na Page/Theme, `PersistenceBootstrap.createStore()` — świadomie odłożone, nie były
  częścią specyfikacji Etapu 4 w `INSTRUKCJA_INTEGRACJI.md`.
- **Etap 5**: Renderer komponentów ✅ — `registerSection`/`registerBlock`,
  `renderPage`/`renderSection`/`renderBlock`, `sectionStyles`/`blockStyles`, `SectionErrorBoundary`
  (15 testów, Vitest + React Testing Library + jsdom). Renderer testowany na atrapach — celowo, bo
  z założenia nie zna konkretnych komponentów; realne sekcje żyją w `packages/component-library`,
  który powstał później (patrz niżej).
- **`packages/editor-core`** (bez numeru etapu w `INSTRUKCJA_INTEGRACJI.md`, ale twardy prerequisite
  Etapu 6 — `ARCHITEKTURA.md` przypisuje mu `CommandStack`/`MoveSectionCommand`) ✅ — `Command`
  interfejs, `CommandStack` (execute/undo/redo), `MoveSectionCommand`, `MoveBlockCommand`,
  `UpdateSectionCommand`, `UpdateBlockCommand` (24 testy). Poza zakresem: `Add/Delete*Command`,
  `Publish*Command`, `Duplicate*Command` — świadomie odłożone do etapów, gdzie faktycznie stają się
  potrzebne (Add/Delete pasują naturalnie do Etapu 7 razem z panelem, ale nie były w nim
  zaimplementowane — patrz niżej; Publish do Etapu 9).
- **Etap 6**: Canvas + drag&drop ✅ — `apps/editor` (Next.js): lista sekcji demo strony
  (seed przez `@editor/persistence`), `@dnd-kit/sortable` reorder wywołujący `MoveSectionCommand`
  przez `useEditorStore` (hook opakowujący `CommandStack`), przyciski Cofnij/Ponów, render przez
  `@editor/renderer` w trybie `edit`. Zweryfikowane w przeglądarce: drag&drop, undo, redo — wszystkie
  działają end-to-end. Odchylenie od opisu w `INSTRUKCJA_INTEGRACJI.md`: „Preview live w iframe" z
  tego etapu przesunięte do Etapu 8 (żywy podgląd/tryb `live` to jego właściwy zakres — tu sekcje
  renderują się bezpośrednio w stronie, nie w iframe). ~~Sekcje to placeholdery~~ — od czasu spike'a
  sekcje treści pochodzą z `packages/component-library`.
- **Etap 7**: Panel właściwości ✅ — kliknięcie sekcji w canvasie ją zaznacza (obramowanie),
  `apps/editor/src/lib/fieldsFromSchema.ts` introspekuje Zod schema preferencji (string/number/
  boolean/enum — `.default()`/`.nullable()`/`.optional()` odwijane), generując formularz w
  `PropertyPanel.tsx`, spięty z `UpdateSectionCommand`. Zweryfikowane w przeglądarce: edycja pola
  `heading` propaguje się na żywo do placeholdera Hero, undo/redo działają też dla edycji pól.
  Świadomie poza zakresem: pola typu tablica obiektów (np. `testimonials.items`, `faq.items`) —
  wymagają osobnego UI z powtarzalnymi polami, nie zwykłego inputu; panel właściwości dla bloków
  (UI) — `UpdateBlockCommand` gotowy i przetestowany w `editor-core`, ale brak demo w `apps/editor`
  (seed nie ma bloków).
- **Etap 8**: Live preview ✅ — przełącznik Edytuj/Podgląd; w Podglądzie cała strona przez
  `renderPage(..., { mode: 'live' })`, bez chrome edytora. Zweryfikowane w przeglądarce.
- **Add/Delete sekcji** (bez numeru etapu — prerequisite realnego page buildera) ✅ —
  `AddSectionCommand`/`DeleteSectionCommand` + paleta + 🗑. Bez tego edytor umiał tylko zmieniać
  kolejność i edytować to, co akurat było w seedzie.
- **`packages/component-library`** (bez numeru etapu; wymuszony przez spike, bo edytor i storefront
  muszą renderować te same komponenty) ✅ częściowo — 7 z 14 sekcji treści + `registerContentSections()`.
- **Integration spike** (`apps/storefront-demo`) ✅ — round-trip dokument JSON → `FilePageRepository`
  → `renderPage(live)` → storefront, tymi samymi komponentami co canvas. Znaleziska (w tym blocker
  `'use client'` na error boundary): patrz `ARCHITEKTURA.md` → „Wynik integration spike'a".
- **Zapis + tryb „własne repo"** (bez numeru etapu; wynik decyzji właściciela o opcji A) ✅ —
  edytor ładuje i zapisuje dokument przez `PageRepository` (przycisk Zapisz → Server Action).
  Round-trip edycja→zapis→storefront zweryfikowany w przeglądarce. `GitHubPageRepository`
  (publikacja = commit do repo sklepu) zaimplementowany i przetestowany na mocku; przełączenie
  lokalne↔produkcja to wyłącznie env (`apps/editor/.env.example`).
  ⚠️ **Nigdy nie uruchomiony przeciw prawdziwemu GitHubowi** — wymaga tokena i repo sklepu
  (konfiguracja właściciela). Do czasu pierwszego realnego uruchomienia traktować jak
  niezweryfikowane, analogicznie do provisioningu w `store-factory.md`.
- **Etap 9**: Draft/publish i historia — `VersionRepository` (draft/publish/historia) jest gotowy
  i przetestowany od Etapu 4; brakuje **wyłącznie spięcia z UI**. Uwaga: w trybie „własne repo"
  historię wersji daje też sam git, więc zakres tego etapu warto przemyśleć, a nie kopiować
  z modelu railsowego.
- **Etap 10**: Media
- **Etap 11**: Motywy
- **Etap 12**: Pełna zgodność funkcjonalna
