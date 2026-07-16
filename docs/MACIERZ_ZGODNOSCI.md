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

| Typ nowy | Rola | Status |
|---|---|---|
| Hero | baner główny | planowane |
| Header | nagłówek | planowane |
| Footer | stopka | planowane |
| ProductGrid | siatka produktów | planowane |
| CategoryGrid | siatka kategorii | planowane |
| ImageBanner | baner z obrazem | planowane |
| RichText | tekst sformatowany | planowane |
| Newsletter | newsletter | planowane |
| Testimonials | opinie | planowane |
| FAQ | FAQ | planowane |
| Video | wideo | planowane |
| Spacer | odstęp | planowane |
| Columns | kolumny | planowane |
| Button | przycisk | planowane |
| Image | obraz | planowane |
| Navigation | nawigacja | planowane |

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
| Dodaj sekcję | `AddSectionCommand` (waliduje typ) | planowane |
| Edytuj sekcję | `UpdateSectionCommand` — merge-patch preferencji, undo-able, panel właściwości w `apps/editor` (Etap 7) | przetestowane (jednostkowo + w przeglądarce) |
| Usuń sekcję | `DeleteSectionCommand` | planowane |
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
| Tryb edycji vs. publiczny | prop `mode: "edit" | "live" | "lazy"` do renderera | przetestowane (`render-section.test.tsx`) |
| Error boundary per-sekcja | `SectionErrorBoundary` w `packages/renderer` — nieznany typ renderuje czytelny fallback zamiast crashować, rzucający komponent też | przetestowane (`render-section.test.tsx`) |

## Status implementacji etapami

- **Etap 1–3**: Audyt, dokumentacja, scaffolding, `packages/schema` ✅
- **Etap 4**: Persistence i wersjonowanie — interfejsy + `node:sqlite` demo ✅
  (`PageRepository`, `ThemeRepository`, `VersionRepository`, `MediaRepository`, `DemoCommerceProvider`;
  45 testów łącznie w `packages/schema`+`packages/persistence`). Poza zakresem tego etapu:
  `duplicate()` na Page/Theme, `PersistenceBootstrap.createStore()` — świadomie odłożone, nie były
  częścią specyfikacji Etapu 4 w `INSTRUKCJA_INTEGRACJI.md`.
- **Etap 5**: Renderer komponentów ✅ — `registerSection`/`registerBlock`,
  `renderPage`/`renderSection`/`renderBlock`, `sectionStyles`/`blockStyles`, `SectionErrorBoundary`
  (15 testów, Vitest + React Testing Library + jsdom). `component-library` (prawdziwe komponenty
  sekcji) to osobny pakiet, nierozpoczęty — na razie renderer testowany na atrapach.
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
  renderują się bezpośrednio w stronie, nie w iframe). Sekcje w `apps/editor/src/lib/sections.tsx`
  to placeholdery, nie `component-library`.
- **Etap 7** (bieżący): Panel właściwości ✅ — kliknięcie sekcji w canvasie ją zaznacza (obramowanie),
  `apps/editor/src/lib/fieldsFromSchema.ts` introspekuje Zod schema preferencji (string/number/
  boolean/enum — `.default()`/`.nullable()`/`.optional()` odwijane), generując formularz w
  `PropertyPanel.tsx`, spięty z `UpdateSectionCommand`. Zweryfikowane w przeglądarce: edycja pola
  `heading` propaguje się na żywo do placeholdera Hero, undo/redo działają też dla edycji pól.
  Świadomie poza zakresem: pola typu tablica obiektów (np. `testimonials.items`, `faq.items`) —
  wymagają osobnego UI z powtarzalnymi polami, nie zwykłego inputu; panel właściwości dla bloków
  (UI) — `UpdateBlockCommand` gotowy i przetestowany w `editor-core`, ale brak demo w `apps/editor`
  (seed nie ma bloków, `component-library` nie istnieje); `Add/DeleteSectionCommand` — panel edytuje
  istniejące sekcje, nie dodaje/usuwa ich.
- **Etap 8**: Live preview
- **Etap 9**: Draft/publish i historia
- **Etap 10**: Media
- **Etap 11**: Motywy
- **Etap 12**: Pełna zgodność funkcjonalna
