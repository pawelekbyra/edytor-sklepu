# Macierz zgodności funkcjonalnej: nowy edytor (TypeScript) → starsze odpowiedniki

> Dokument pokazuje bieżący stan rewrite'u. Sam typ lub schema może być już zaimplementowany,
> mimo że jego komponent React, persistence albo UI nadal są planowane. Po każdej zmianie status
> powinien przechodzić kolejno: `planowane` → `zaimplementowane` → `przetestowane`.

Legenda:

- `planowane` — brak implementacji,
- `zaimplementowane (schema only)` — istnieje kontrakt danych, ale nie działa jeszcze funkcja użytkowa,
- `przetestowane (schema only)` — kontrakt danych ma reprezentatywne testy, ale renderer/UI nadal nie istnieją,
- `zaimplementowane` — funkcja istnieje,
- `przetestowane` — funkcja istnieje i ma odpowiednie testy.

## 1. Model danych i workflow

| Funkcja | Odpowiednik w nowej architekturze | Status | Test |
|---|---|---|---|
| Hierarchia Store→Theme→Page→Section→Block→Link | `packages/schema`: `PageSchema`, `ThemeSchema`, `SectionSchema`, `BlockSchema` | przetestowane (schema only) | `packages/schema/test/page.test.ts` |
| Pole `type` jako dyskryminator | Zod discriminated union | przetestowane (schema only) | `packages/schema/test/{section,block,page}.test.ts` |
| Rejestr rozszerzalności typów | `packages/renderer` component registry | planowane | |
| Preferencje jako płaskie skalary | pola w schema per typ, z `.default()` | przetestowane (schema only) | `packages/schema/test/section.test.ts` |
| Rich text | pole `html: string` w schema + bezpieczny renderer | zaimplementowane (schema only) | |
| Assety | `MediaRepository`; schema trzyma `assetId` | zaimplementowane (schema only) | |
| Draft/published jako wersje | `PageVersionSchema` | przetestowane (schema only) | `packages/schema/test/page-version.test.ts` |
| Publish = transakcyjna podmiana | `VersionRepository.publish(pageId)` | planowane | |
| Duplikowanie motywu/strony | `PageRepository.duplicate()` / `ThemeRepository.duplicate()` | planowane | |
| Reorder sekcji/bloków | `MoveSectionCommand` / `MoveBlockCommand` + `@dnd-kit` | planowane | |
| Undo/redo | `CommandStack.undo()` / `redo()` | planowane | |
| Historia zmian | `VersionRepository.listVersions(pageId)` | planowane | |
| Izolacja między sklepami | `storeId` w schema i repozytoriach | zaimplementowane (schema only) | testy persistence planowane |
| Domyślny motyw po utworzeniu | bootstrap po stronie persistence/backendu | planowane | |
| Allowlist typów | Zod odrzuca nieznany `type` | przetestowane (schema only) | `packages/schema/test/` |

## 2. Typy stron (15)

Wszystkie typy są obecne w `PAGE_TYPES` i akceptowane przez `PageSchema`. Testy obejmują wybrane
typy i odrzucenie nieznanej wartości; rzeczywiste ekrany, dane systemowe i rendering są planowane.

| Typ | Rola | Odpowiednik nowy | Status |
|---|---|---|---|
| Homepage | strona główna | `PageType: "homepage"` | zaimplementowane (schema only) |
| Custom | dowolna strona | `PageType: "custom"` | zaimplementowane (schema only) |
| ProductDetails | PDP | `PageType: "product-details"` | zaimplementowane (schema only) |
| Taxon | strona kategorii | `PageType: "taxon"` | zaimplementowane (schema only) |
| TaxonList | lista kategorii | `PageType: "taxon-list"` | zaimplementowane (schema only) |
| ShopAll | wszystkie produkty | `PageType: "shop-all"` | zaimplementowane (schema only) |
| SearchResults | wyniki wyszukiwania | `PageType: "search-results"` | zaimplementowane (schema only) |
| Cart | koszyk — layout, bez przepisywania commerce | `PageType: "cart"` | zaimplementowane (schema only) |
| Checkout | checkout — layout | `PageType: "checkout"` | zaimplementowane (schema only) |
| Wishlist | lista życzeń | `PageType: "wishlist"` | zaimplementowane (schema only) |
| Account | panel konta | `PageType: "account"` | zaimplementowane (schema only) |
| Login | logowanie | `PageType: "login"` | zaimplementowane (schema only) |
| Password | coming soon | `PageType: "password"` | zaimplementowane (schema only) |
| Post | wpis blogowy | `PageType: "post"` | zaimplementowane (schema only) |
| PostList | lista wpisów | `PageType: "post-list"` | zaimplementowane (schema only) |

## 3. Typy sekcji (16)

Schematy wszystkich sekcji istnieją w `packages/schema`. Testy obejmują reprezentatywne przypadki,
między innymi hero, image banner i FAQ. Komponenty React, renderer oraz edycja wizualna są planowane.

| Typ | Rola | Schema | Komponent/renderer |
|---|---|---|---|
| Hero | baner główny | zaimplementowane | planowane |
| Header | nagłówek | zaimplementowane | planowane |
| Footer | stopka | zaimplementowane | planowane |
| ProductGrid | siatka produktów | zaimplementowane | planowane |
| CategoryGrid | siatka kategorii | zaimplementowane | planowane |
| ImageBanner | baner z obrazem | zaimplementowane | planowane |
| RichText | tekst sformatowany | zaimplementowane | planowane |
| Newsletter | newsletter | zaimplementowane | planowane |
| Testimonials | opinie | zaimplementowane | planowane |
| FAQ | FAQ | zaimplementowane | planowane |
| Video | wideo | zaimplementowane | planowane |
| Spacer | odstęp | zaimplementowane | planowane |
| Columns | kolumny | zaimplementowane | planowane |
| Button | przycisk | zaimplementowane | planowane |
| Image | obraz | zaimplementowane | planowane |
| Navigation | nawigacja | zaimplementowane | planowane |

## 4. Typy bloków (4)

Schematy istnieją; testy bloków i komponenty renderujące wymagają osobnego pokrycia.

| Typ | Rola | Schema | Komponent/renderer |
|---|---|---|---|
| Button | przycisk CTA | zaimplementowane | planowane |
| Image | obraz w sekcji | zaimplementowane | planowane |
| RichText | tekst w sekcji | zaimplementowane | planowane |
| Navigation | link nawigacyjny | zaimplementowane | planowane |

## 5. Operacje edytora

| Operacja | Odpowiednik nowy | Status |
|---|---|---|
| Utwórz/edytuj/usuń motyw | `ThemeRepository` CRUD | planowane |
| Utwórz/edytuj/usuń stronę | `PageRepository` CRUD | planowane |
| Dodaj sekcję | `AddSectionCommand` | planowane |
| Edytuj sekcję | `UpdateSectionCommand` | planowane |
| Usuń sekcję | `DeleteSectionCommand` | planowane |
| Przesuń sekcję | `MoveSectionCommand` | planowane |
| Przywróć ustawienia domyślne | `RestoreSectionDefaultsCommand` | planowane |
| Operacje na blokach | `Add/Update/Delete/MoveBlockCommand` | planowane |
| Opublikuj motyw/stronę | `PublishThemeCommand`, `PublishPageCommand` | planowane |
| Powiel motyw/stronę | `DuplicateThemeCommand`, `DuplicatePageCommand` | planowane |

## 6. Renderowanie

| Funkcja | Odpowiednik nowy | Status |
|---|---|---|
| Renderowanie strony | `renderPage(document, context)` w `packages/renderer` | planowane |
| Renderowanie sekcji | `renderSection(section, context)` | planowane |
| Konwersja type → component | component registry | planowane |
| Preferencje → style | `sectionStyles()` / `blockStyles()` | planowane |
| Tryby editor/preview/live | kontekst renderera | planowane |
| Error boundary per sekcja | bezpieczny fallback renderera | planowane |

## Status etapów

- **Fundament rewrite'u — gotowe:** audyt, dokumentacja, pnpm workspace i `packages/schema` z testami.
- **Następny krok:** `editor-core`, persistence i minimalny pionowy scenariusz z trzema sekcjami.
- **Dalej:** renderer oraz component library.
- **Następnie:** canvas, panel właściwości i live preview.
- **Po tym:** draft/publish, historia, media i motywy.
- **Na końcu:** integracja z `sklepik`, `sklepikFront` i pełne E2E.
