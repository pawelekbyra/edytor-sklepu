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
| Rejestr rozszerzalności typów | `packages/renderer` component registry | planowane | |
| Preferencje jako płaskie skalary | pola w schema per typ, z `.default()` | przetestowane | `packages/schema/test/section.test.ts` |
| Rich text (ActionText) | pole `html: string` w schema | planowane | |
| Assety (obraz sekcji, screenshot) | `MediaRepository` zwraca URL; schema trzyma `assetId` | planowane | |
| Preview = duplikat, nie wersja | `PageVersionSchema` z `status: draft/published` | zaimplementowane (schema only) | `packages/schema/test/page-version.test.ts` |
| Publish = transakcyjna podmiana | `VersionRepository.publish(pageId)` — transakcja SQLite | planowane | |
| Duplikowanie motywu/strony | `PageRepository.duplicate()` / `ThemeRepository.duplicate()` | planowane | |
| Reorder sekcji/bloków | `editor-core`: `MoveSectionCommand`/`MoveBlockCommand` + `@dnd-kit` | planowane | |
| Undo/redo | `editor-core` command stack (`CommandStack.undo()/redo()`) | planowane | |
| Historia zmian | `VersionRepository.listVersions(pageId)` | planowane | |
| Izolacja między sklepami | `storeId` wymagane pole w każdym repozytorium | planowane | |
| Domyślny motyw po utworzeniu | `PersistenceBootstrap.createStore()` | planowane | |
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
| Edytuj sekcję | `UpdateSectionCommand` | planowane |
| Usuń sekcję | `DeleteSectionCommand` | planowane |
| Przesuń sekcję | `MoveSectionCommand` (undo-able) | planowane |
| Przywróć ustawienia do domyślnych | `RestoreSectionDefaultsCommand` | planowane |
| Analogicznie dla bloków | `Add/Update/Delete/MoveBlockCommand` | planowane |
| Opublikuj temat+strona | `PublishThemeCommand`, `PublishPageCommand` | planowane |
| Powiel temat/stronę | `DuplicateThemeCommand`, `DuplicatePageCommand` | planowane |

## 6. Renderowanie

| Funkcja | Odpowiednik nowy | Status |
|---|---|---|
| `render_page(page)` | `renderPage(page, versionId?)` w `packages/renderer` | planowane |
| `render_section(section)` — 3 tryby | `renderSection(section, { mode: "edit"/"live"/"lazy" })` | planowane |
| Konwersja type → component | component registry w `packages/renderer` | planowane |
| Preferencje → CSS inline | `sectionStyles()`/`blockStyles()` w `packages/renderer` | planowane |
| Tryb edycji vs. publiczny | prop `mode: "edit" | "live"` do renderera | planowane |
| Error boundary per-sekcja | error boundary w `packages/renderer` | planowane |

## Status implementacji etapami

- **Etap 1–3** (bieżący): Audyt, dokumentacja, scaffolding, `packages/schema` ✅
- **Etap 4**: Persistence i wersjonowanie — interfejsy + SQLite demo
- **Etap 5**: Renderer komponentów
- **Etap 6**: Canvas + drag&drop
- **Etap 7**: Panel właściwości
- **Etap 8**: Live preview
- **Etap 9**: Draft/publish i historia
- **Etap 10**: Media
- **Etap 11**: Motywy
- **Etap 12**: Pełna zgodność funkcjonalna
