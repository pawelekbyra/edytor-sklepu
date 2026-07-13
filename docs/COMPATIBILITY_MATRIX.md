# Macierz zgodności funkcjonalnej: `spree_page_builder` (Rails) → nowy edytor (TypeScript)

> Status na start rewrite'u: **wszystko `planned`**. Ten dokument jest żywy — po każdym etapie z
> `docs/NEW_ARCHITECTURE.md` odpowiednie wiersze przechodzą `planned` → `implemented` → `tested`.
> Referencje "Lokalizacja w Rails" pochodzą z audytu w [`docs/EDITOR_ARCHITECTURE.md`](EDITOR_ARCHITECTURE.md).

Legenda statusu: `planned` (opisane, nic nie napisane) · `implemented` (kod istnieje) ·
`tested` (kod + test jednostkowy/integracyjny zielony).

## 1. Model danych i workflow (funkcje przekrojowe)

| Funkcja | Lokalizacja w Rails | Odpowiednik w nowej architekturze | Status | Test zgodności |
|---|---|---|---|---|
| Hierarchia Store→Theme→Page→Section→Block→Link | `page_builder/app/models/spree/{page,theme,page_section,page_block,page_link}.rb` | `packages/schema`: `PageSchema`, `ThemeSchema`, `SectionSchema`, `BlockSchema` (`packages/schema/src/{page,theme,section,block}.ts`) | tested | `packages/schema/test/page.test.ts` |
| STI (`type` jako dyskryminator klasy) | kolumna `type` w każdej z 4 tabel (`create_page_builder_models` migration) | Zod discriminated union po polu `type` w `SectionSchema`/`BlockSchema`/`PageSchema` | tested | `packages/schema/test/{section,block,page}.test.ts` — "rejects an unknown type" |
| Rejestr rozszerzalności typów | `page_builder/lib/spree/page_builder/engine.rb` (`Spree.pages/page_sections/page_blocks/themes`) | `packages/renderer` component registry (`registerSection(type, Component)`) | planned | test: rejestr zawiera dokładnie zaimplementowane typy, nieznany typ → fallback/error |
| Preferencje jako płaskie skalary | `preference :x, :string/:integer/:boolean, default: ...` w `page_section.rb`, `page_block.rb`, `theme.rb` | pola w Zod schema per typ, z `.default()` (`packages/schema/src/common.ts`: `SectionStyleSchema`/`BlockStyleSchema`) | tested | `packages/schema/test/section.test.ts` ("image_banner defaults"), `test/block.test.ts` |
| Rich text (ActionText) | `has_rich_text :text`/`:description` w `page_section.rb`, `page_block.rb` | pole `text: { html: string }` w schema (bez ActionText-owego modelu embedów) | planned | test round-trip: HTML wejście → zapis → odczyt bez utraty |
| Assety (obraz sekcji/bloku, screenshot motywu) | `has_one_attached :asset/:screenshot` (Active Storage) | `MediaRepository` (packages/persistence) zwraca URL; schema trzyma `assetId`/`assetUrl` | planned | test: upload → URL zwrócony → sekcja referencjonuje `assetId` |
| Preview = duplikat rekordu, nie wersja pola | `Spree::Previewable` concern, `parent_id`/`previews` | `PageVersionSchema` z `status: draft/published` (`packages/schema/src/page-version.ts`) — schema gotowa, logika przełączania w `editor-core`/`persistence` jeszcze nie | implemented (schema only) | `packages/schema/test/page-version.test.ts` |
| Publish = transakcyjna podmiana referencji | `Theme#promote`, `Page#promote` (`ApplicationRecord.transaction`) | `VersionRepository.publish(pageId)` — atomowa operacja w SQLite (transakcja) | planned | test integracyjny: publish jest all-or-nothing (symulacja błędu w trakcie) |
| Duplikowanie motywu/strony | `Theme#duplicate` (`Themes::Duplicator`), `Page#duplicate`, `PageSection#deep_clone` | `PageRepository.duplicate(pageId)` / `ThemeRepository.duplicate(themeId)` | planned | test: duplikat ma nowe ID, te same sekcje/bloki/preferencje |
| Reorder sekcji/bloków | `acts_as_list` (`position` column), `move_higher`/`move_lower` | `editor-core`: `MoveSectionCommand`/`MoveBlockCommand` (undo-able), `@dnd-kit` w UI | planned | test jednostkowy komend: `do()`/`undo()` przywraca dokładną kolejność |
| Undo/redo | brak w Rails (nie istniało) | `editor-core` command stack (`CommandStack.undo()/redo()`) | planned | test: sekwencja N komend + undo×N → stan wyjściowy |
| Historia zmian / wersjonowanie | brak w Rails (tylko preview/publish, bez historii) | `packages/persistence` `VersionRepository.listVersions(pageId)` | planned | test: N publikacji → N wpisów historii, każdy odczytywalny |
| Izolacja danych między sklepami | `Theme belongs_to :store`, scoping przez `current_store.themes`/`current_store.pages` w kontrolerach | `storeId` wymagane pole w każdym repozytorium, filtrowanie na poziomie zapytań | planned | test: repozytorium zwraca 0 wyników dla cudzego `storeId` |
| Domyślny motyw + domyślne taksonomie po utworzeniu sklepu | `StoreDecorator#create_default_theme`, `#ensure_default_taxonomies` | `PersistenceBootstrap.createStore()` (demo) | planned | test: nowy sklep ma dokładnie 1 motyw `default: true` |
| Allowlist typów przy tworzeniu (bezpieczeństwo) | `PageSectionsController#available_page_section_types`, `PageBlocksController#allowed_types` (nie ma dowolnego `constantize`) | walidacja Zod odrzuca nieznany `type` na wejściu do `editor-core` command | planned | test: próba utworzenia sekcji nieistniejącego typu → błąd walidacji, nie wyjątek runtime |

## 2. Typy stron (15 w Rails)

| Typ Rails | Plik | Rola | Odpowiednik nowy | Status |
|---|---|---|---|---|
| `Homepage` | `pages/homepage.rb` | strona główna, `customizable?` | `PageType: "homepage"` w schema | planned |
| `Custom` | `pages/custom.rb` | dowolna strona tworzona przez usera, ma `slug` | `PageType: "custom"` | planned |
| `ProductDetails` | `pages/product_details.rb` | PDP | `PageType: "product-details"` | planned |
| `Taxon` | `pages/taxon.rb` | strona kategorii | `PageType: "taxon"` | planned |
| `TaxonList` | `pages/taxon_list.rb` | lista kategorii | `PageType: "taxon-list"` | planned |
| `ShopAll` | `pages/shop_all.rb` | wszystkie produkty | `PageType: "shop-all"` | planned |
| `SearchResults` | `pages/search_results.rb` | wyniki wyszukiwania | `PageType: "search-results"` | planned |
| `Cart` | `pages/cart.rb` | koszyk | `PageType: "cart"` (layout tylko, dane z `CommerceProvider`) | planned |
| `Checkout` | `pages/checkout.rb` | checkout | `PageType: "checkout"` (poza zakresem commerce — layout only) | planned |
| `Wishlist` | `pages/wishlist.rb` | lista życzeń | `PageType: "wishlist"` | planned |
| `Account` | `pages/account.rb` | panel konta | `PageType: "account"` | planned |
| `Login` | `pages/login.rb` | logowanie | `PageType: "login"` | planned |
| `Password` | `pages/password.rb` | strona "coming soon" | `PageType: "password"` | planned |
| `Post` | `pages/post.rb` | wpis blogowy | `PageType: "post"` | planned |
| `PostList` | `pages/post_list.rb` | lista wpisów | `PageType: "post-list"` | planned |

Uwaga: `Cart`/`Checkout`/`Login`/`Account`/`Wishlist` w Rails to strony "systemowe" (sekcje o
`role: 'system'` renderujące realną logikę Spree, np. formularz logowania) — w nowej architekturze
będą **layoutami** wokół danych z `CommerceProvider`/demo auth, nie pełną reimplementacją logiki
commerce (zgodnie z ograniczeniem "nie przepisuj Spree Commerce").

## 3. Typy sekcji (25 w Rails)

| Typ Rails | Rola | Odpowiednik w `component-library` | Status |
|---|---|---|---|
| `Header` | header (layout) | `Header` | planned |
| `Footer` | footer (layout) | `Footer` | planned |
| `AnnouncementBar` | header (layout) | nowy: `AnnouncementBar` (dodatek do listy z briefu) | planned |
| `Newsletter` | footer (layout, ale też content) | `Newsletter` | planned |
| `ImageBanner` | content | `ImageBanner` (najbliższy odpowiednik `hero` z briefu) | planned |
| `ImageWithText` | content | `Columns` + `Image` (kompozycja) lub nowy `ImageWithText` | planned |
| `RichText` | content | `RichText` | planned |
| `Video` | content | `Video` | planned |
| `PageTitle` | content | nowy, prosty: `PageTitle` (poza listą z briefu, mały dodatek) | planned |
| `Breadcrumbs` | content | nowy: `Navigation`-owy wariant `Breadcrumbs` | planned |
| `FeaturedProduct` | content | mapuje się na `ProductGrid` z `limit: 1`/wariant | planned |
| `FeaturedTaxon` | content | `CategoryGrid` (pojedyncza kategoria z produktami) | planned |
| `FeaturedTaxons` | content | `CategoryGrid` (wiele kategorii) | planned |
| `TaxonGrid` | content | `CategoryGrid` | planned |
| `TaxonBanner` | content (layout strony kategorii) | `ImageBanner` wariant dla `PageType: "taxon"` | planned |
| `CollectionBanner` | content | `ImageBanner` wariant | planned |
| `ProductGrid` | content | `ProductGrid` | planned |
| `RelatedProducts` | content | `ProductGrid` wariant `related` | planned |
| `ProductDetails` | system (PDP) | poza `component-library` — złożenie z bloków `products/*` w kontekście `PageType: "product-details"` | planned |
| `FeaturedPosts` | content | mapuje się na przyszły `PostGrid`/`ProductGrid`-analog dla treści (nie ma w briefie — do doprecyzowania przy etapie 12) | planned |
| `PostGrid` | content (lista wpisów) | jw. | planned |
| `PostDetails` | system (strona posta) | jw. | planned |
| `CustomCode` | content | nowy: `CustomCode` (raw HTML/script — wymaga sandboxingu w Next.js, do zaprojektowania w etapie 7) | planned |
| `MainPasswordHeader` | header (tryb "coming soon") | wariant `Header` dla trybu password-protected | planned |
| `MainPasswordFooter` | footer (tryb "coming soon") | wariant `Footer` | planned |

Sekcje z briefu bez dzisiejszego odpowiednika w Rails — **nowe komponenty**, projektowane od zera w
etapie 5/7: `Hero` (jeśli ma się różnić od `ImageBanner`), `Testimonials`, `FAQ`, `Spacer`, `Button`
(jako samodzielna sekcja, nie tylko blok).

## 4. Typy bloków (16 w Rails)

| Typ Rails | Kontekst użycia | Odpowiednik nowy | Status |
|---|---|---|---|
| `Heading` | ogólny (w Hero, ImageWithText, itd.) | pole `heading` w schema sekcji, nie osobny komponent-blok | planned |
| `Subheading` | jw. | pole `subheading` | planned |
| `Text` | jw. | pole `body`/`RichText` fragment | planned |
| `Buttons` | CTA w sekcji | `Button` (komponent z listy briefu, wiele instancji) | planned |
| `Image` | obraz w sekcji | `Image` | planned |
| `Link` | pojedynczy link nawigacyjny | `PageLink`-owy typ w schema, renderowany przez `Navigation` | planned |
| `Nav` | menu | `Navigation` | planned |
| `MegaNav` | rozwijane menu | `Navigation` wariant `mega` | planned |
| `MegaNavWithSubcategories` | jw. + auto-listowanie podkategorii | `Navigation` wariant `mega-auto` zasilany `CommerceProvider` | planned |
| `NewsletterForm` | formularz zapisu | część `Newsletter` (nie osobny blok w nowej architekturze — pole formularza) | planned |
| `Products::Title` | PDP | pole w kompozycji `PageType: "product-details"`, zasilane `CommerceProvider` | planned |
| `Products::Price` | PDP | jw. | planned |
| `Products::Description` | PDP | jw. | planned |
| `Products::VariantPicker` | PDP | jw. (poza zakresem pełnej logiki commerce — demo dane) | planned |
| `Products::QuantitySelector` | PDP | jw. | planned |
| `Products::BuyButtons` | PDP | jw. (przycisk demo, bez realnego dodania do koszyka) | planned |
| `Products::Share` | PDP | jw. | planned |
| `Products::Brand` | PDP | jw. | planned |

## 5. Kontrolery / trasy admina → API edytora

| Endpoint Rails | Plik | Odpowiednik nowy | Status |
|---|---|---|---|
| `GET/PUT /admin/storefront` | `storefront_controller.rb` | `apps/editor` ustawienia sklepu (SEO, social) — osobny ekran, niski priorytet (etap 11+) | planned |
| `resources :themes` + `update_with_page`, `publish`, `clone` | `themes_controller.rb` | `editor-core` commands: `PublishThemeCommand`, `DuplicateThemeCommand` + `ThemeRepository` | planned |
| `resources :pages` | `pages_controller.rb` | `PageRepository` CRUD + `apps/editor` routing stron | planned |
| `resources :sections` (nested pod theme/page) | `page_sections_controller.rb#new/#create` | `AddSectionCommand` (waliduje typ przeciw rejestrowi) | planned |
| `resources :page_sections` (`edit/update/destroy`, `move_higher/lower`, `restore_design_settings_to_defaults`) | `page_sections_controller.rb` | `UpdateSectionCommand`, `DeleteSectionCommand`, `MoveSectionCommand`, `RestoreSectionDefaultsCommand` | planned |
| `resources :blocks` (analogicznie) | `page_blocks_controller.rb` | `AddBlockCommand`, `UpdateBlockCommand`, `DeleteBlockCommand`, `MoveBlockCommand` | planned |
| `resources :links` | `page_links_controller.rb` | `UpdateLinkCommand` (linki jako pole w schema, nie osobny encja-per-request) | planned |
| Sesja: `theme_preview_id`/`page_preview_id` | `Spree::Admin::PageBuilderConcern#set_variables` | stan edytora w `editor-core` (aktywny `pageId`+`themeId`+`versionId` w pamięci/URL, nie w cookie sesji) | planned |

## 6. Renderowanie storefrontu (kontrakt do odtworzenia w `packages/renderer`)

| Funkcja Rails | Plik | Odpowiednik nowy | Status |
|---|---|---|---|
| `render_page(page)` | `storefront/app/helpers/spree/page_helper.rb` | `renderPage(page, versionId?)` w `packages/renderer` | planned |
| `render_section(section)` — 3 tryby: edycja/lazy/zwykłe | jw. | `renderSection(section)`; tryb "edycja" → `editor-core` overlay w `apps/editor`, tryb lazy → Next.js streaming/Suspense zamiast Turbo Frame lazy | planned |
| `to_partial_path` (`type` → nazwa pliku) | `page_section.rb#to_partial_path` | component registry lookup po `type` w `packages/renderer` | planned |
| `section_styles`/`block_styles` (preferencje → CSS inline) | `storefront/app/helpers/spree/theme_helper.rb` | funkcje `sectionStyles()`/`blockStyles()` w `packages/renderer`, czyste funkcje `preferences → CSSProperties` | planned |
| `page_builder_enabled?` (tryb edycji vs. publiczny) | `theme_helper.rb` | prop `mode: "edit" \| "preview" \| "live"` przekazywany do renderera | planned |
| Obsługa błędu renderowania partiala (`rescue ActionView::MissingTemplate`) | `page_helper.rb#render_section` | error boundary per-sekcja w `packages/renderer`/React | planned |

## 7. Pokrycie testami (stan wyjściowy w Rails — punkt odniesienia)

Ze statycznego przeglądu (`docs/EDITOR_ARCHITECTURE.md`, sekcja 1): `page_builder/spec` — 28 plików
(modele, kontrolery admina, joby, serwisy, dekoratory), `storefront/spec` — 54 pliki (kontrolery,
feature specs, helpery, requesty). Nowa implementacja TS powinna docelowo pokryć testami
odpowiadające zachowania — nie 1:1 liczbę plików, ale 1:1 zachowania z tabel powyżej, zanim etap 13
(usunięcie Rails) zostanie wykonany.

## Jak czytać ten dokument w kolejnych etapach

Po zaimplementowaniu danego wiersza: zmień `planned` → `implemented`, dopisz link do pliku
źródłowego TS. Po napisaniu i przejściu testu: `implemented` → `tested`, dopisz link do pliku testu.
Wiersz nie powinien nigdy przeskakiwać z `planned` prosto do `tested` bez przejścia przez
`implemented` w commitach — to sygnał, że test nie był rzeczywiście uruchomiony przeciwko kodowi.
