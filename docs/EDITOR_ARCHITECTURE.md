# Architektura wizualnego edytora stron (`spree_page_builder`)

> Dokument opisuje stan repozytorium [`pawelekbyra/edytor-sklepu`](https://github.com/pawelekbyra/edytor-sklepu)
> (fork `spree/spree-rails-storefront`) na commit `86bda92`. Repozytorium jest **izolowane** —
> nie zawiera i nie powinno zawierać zależności od `sklepik`, `sklepikFront`, Store Factory,
> dashboardu React ani storefrontu Next.js.

## 1. Status audytu i ograniczenia środowiska

Środowisko, w którym wykonano ten audyt, **nie posiada zainstalowanego Ruby/Bundlera/Dockera/WSL**,
więc nie było możliwe fizyczne uruchomienie `bundle exec rake test_app` ani `bundle exec rspec`.
Audyt jest wynikiem analizy statycznej kodu, migracji, configów i pliku `.github/workflows/ci.yml`.

Co wiemy o testach bez ich uruchamiania:

- Oba gemy mają skonfigurowane CI (`.github/workflows/ci.yml`) uruchamiane na `push`/`pull_request`
  do `main`, w macierzy PostgreSQL/MySQL, z Ruby 4.0. Fork nie ma zarejestrowanych przebiegów Actions
  (`GET /repos/pawelekbyra/edytor-sklepu/actions/runs` zwraca `total_count: 0`) — najpewniej Actions
  nie były jeszcze uruchamiane na tym forku.
- `page_builder/spec` zawiera **28 plików spec** (modele, kontrolery admina, joby, serwisy, dekoratory).
- `storefront/spec` zawiera **54 pliki spec** (kontrolery, feature specs z Capybara/Chrome, helpery,
  requesty, i18n).
- Testy wymagają wygenerowania „dummy” aplikacji Rails przez `bundle exec rake test_app` w katalogu
  każdego gema (zgodnie z `CLAUDE.md`), używają RSpec + FactoryBot + `stub_authorization!`.

**Rekomendacja**: przed napisaniem/scaleniem PR z realną zmianą kodu, testy powinny zostać uruchomione
w środowisku z Ruby 3.2+ (CI używa 4.0) — lokalnie, w WSL, w Dockerze lub przez CI na PR. Nie oznaczam
tego etapu jako "zweryfikowane zielono", tylko jako "structuralnie kompletne wg analizy statycznej".

## 2. Podział repozytorium

Repo zawiera dwa gemy Rails Engine, połączone wspólnym numerem wersji
(`lib/spree_storefront/version.rb`):

| Gem | Katalog | Licencja | Rola |
|---|---|---|---|
| `spree_storefront` | `storefront/` | MIT | Storefront: katalog, koszyk, checkout, konto klienta — środowisko demo/testowe do podglądu edytowanych stron |
| `spree_page_builder` | `page_builder/` | AGPL-3.0-or-later | Wizualny edytor stron i motywów — **główny przedmiot tego etapu prac** |

Oba zależą od `spree` (core) i `spree_admin` (interfejs administracyjny) z głównego repo Spree — te
zależności są zewnętrzne wobec tego forka i nie są tu vendorowane.

## 3. Model danych edytora

Hierarchia (`page_builder/app/models/spree/`):

```
Spree::Store
  └─ has_many :themes (Spree::Theme)
       ├─ has_many :layout_sections (Spree::PageSection, pageable: Theme)   # header/footer/newsletter/announcement_bar
       └─ has_many :pages (Spree::Page, pageable: Theme)                    # 14 wbudowanych typów stron
            └─ has_many :sections (Spree::PageSection, pageable: Page)
                 └─ has_many :blocks (Spree::PageBlock)
                      └─ has_many :links (Spree::PageLink, polymorphic parent)
  └─ has_many :pages (Spree::Pages::Custom, pageable: Store)                # strony niestandardowe, poza motywem
```

Kluczowe modele:

- **`Spree::Page`** (`page.rb`) — STI, 14 podklas w `page_builder/app/models/spree/pages/`
  (`Homepage`, `Cart`, `Checkout`, `Custom`, `ProductDetails`, `Taxon`, `TaxonList`, `ShopAll`,
  `SearchResults`, `Wishlist`, `Login`, `Password`, `Post`, `PostList`, `Account`). `pageable` jest
  polimorficzne — strona należy albo do `Store` (custom pages), albo do `Theme`.
- **`Spree::Theme`** (`theme.rb`) — motyw sklepu, `belongs_to :store`. Wiele motywów na sklep,
  jeden `default: true`. Podklasa `Spree::Themes::Default` to jedyny zarejestrowany motyw obecnie.
- **`Spree::PageSection`** (`page_section.rb`) — STI, **25 zarejestrowanych typów** w
  `page_builder/app/models/spree/page_sections/` (np. `image_banner`, `rich_text`, `product_grid`,
  `featured_taxon`, `newsletter`, `header`, `footer`) — identyfikatory zgodne z konwencją oczekiwaną
  w dalszej integracji (`type.demodulize.underscore` np. `image_banner`). `pageable` polimorficzne:
  `Page` (sekcje treści) albo `Theme` (sekcje layoutu: header/footer/newsletter/announcement_bar).
  Każda klasa ma `role` (`content` / `header` / `footer`) używane do renderowania w odpowiednim
  miejscu layoutu.
- **`Spree::PageBlock`** (`page_block.rb`) — STI, 16 zarejestrowanych typów w
  `page_builder/app/models/spree/page_blocks/` (`heading`, `text`, `image`, `buttons`, `nav`,
  `mega_nav`, `newsletter_form`, warianty `products/*` do PDP). `belongs_to :section`.
- **`Spree::PageLink`** — linki nawigacyjne wewnątrz sekcji/bloków (np. nav, mega-nav, breadcrumbs),
  `belongs_to :parent` (polimorficzne: Section lub Block), `belongs_to :linkable` (polimorficzne:
  Page, Product, Taxon, Policy — przez `Spree::Linkable`).

Rejestr rozszerzalności (`page_builder/lib/spree/page_builder/engine.rb`, `config.after_initialize`):

```ruby
Rails.application.config.spree.themes           # [Spree::Themes::Default]
Rails.application.config.spree.theme_layout_sections  # AnnouncementBar, Header, Newsletter, Footer
Rails.application.config.spree.pages             # 15 klas stron
Rails.application.config.spree.page_sections     # 25 klas sekcji
Rails.application.config.spree.page_blocks       # 16 klas bloków
```

dostępny też przez skróty `Spree.themes`, `Spree.pages`, `Spree.page_sections`, `Spree.page_blocks`
oraz `Spree.page_builder.*`. Nowe typy sekcji/bloków/stron/motywów dodaje się przez dopisanie klasy
do odpowiedniej tablicy — to jest właściwy punkt rozszerzeń, a nie modyfikacja istniejących widoków.

## 4. Serializacja ustawień sekcji/bloków

Ustawienia (`preferences`) są przechowywane jako kolumna `text` (`spree_page_sections.preferences`,
`spree_page_blocks.preferences`, `spree_themes.preferences`) serializowana przez mechanizm
`preference`/`Preferable` odziedziczony z `spree_core` (nie jest częścią tego repo). Każda klasa
deklaruje swoje preferencje jako proste typy (`:string`, `:integer`, `:boolean`) z wartościami
domyślnymi:

```ruby
preference :text_color, :string, default: -> { self.class::TEXT_COLOR_DEFAULT }
preference :top_padding, :integer, default: -> { self.class::TOP_PADDING_DEFAULT }
```

To ma istotną konsekwencję dla przyszłej integracji z API/Next.js: **ustawienia są już płaskie i
serializowalne** (proste typy skalarne, brak zagnieżdżonych obiektów Ruby) — nadają się do
zserializowania jako JSON bez dodatkowej pracy. Treści bogate (`has_rich_text :text`,
`has_rich_text :description`) korzystają z ActionText i wymagałyby osobnej serializacji (HTML/JSON)
przy ekspozycji przez API.

Rich text i assety (`has_one_attached :asset`, `has_one_attached :screenshot`) są jedynymi polami,
które nie są trywialnie serializowalne 1:1 — trzeba by je mapować na URL-e w reprezentacji API.

## 5. Podgląd i publikacja (preview / promote)

Kluczowy mechanizm edytora to **podgląd przez duplikat rekordu**, nie przez wersjonowanie pól:

- `Spree::Previewable` (concern) dodaje `belongs_to :parent` / `has_many :previews` do `Theme` i `Page`.
  `preview?` = `parent.present?`.
- `Theme#create_preview` / `Page#create_preview` głęboko klonują (`deep_clone`) sekcje, bloki, linki
  i assety do nowego rekordu z `parent` wskazującym na oryginał.
- Sesja admina trzyma `session[:theme_preview_id]` i `session[:page_preview_id]`
  (`Spree::Admin::PageBuilderConcern#set_variables`) — wszystkie zmiany w edytorze (drag&drop sekcji,
  edycja treści, ustawienia) są zapisywane na rekordach *preview*, nigdy bezpośrednio na
  opublikowanej wersji.
- `Theme#promote` / `Page#promote` (wywoływane przez `ThemesController#update_with_page` pod
  `PUT /admin/themes/:id/update_with_page`) w transakcji: przepina strony na nowy motyw, usuwa stary
  motyw (z pozostałymi podglądami), aktualizuje `parent: nil`. To jest operacja "Publish"/"Save".
- `Theme#duplicate` (`Themes::Duplicator` service) tworzy pełną, niezależną kopię motywu (nie
  podgląd) — używane przy klonowaniu motywu w UI (`POST /admin/themes/:id/clone`).

Ten wzorzec (edytuj kopię → publikuj przez podmianę referencji w transakcji) jest tym, co trzeba
zachować przy każdej zmianie modelu danych — jest to fundament funkcji "podgląd zmian" wymienionej
w zadaniu.

## 6. Kontrolery i trasy (warstwa admina)

Trasy (`page_builder/config/routes.rb`), wszystkie pod `namespace :admin`:

```
resource  :storefront                      # ustawienia sklepu (SEO, social, custom code)
resources :themes                          # + member: update_with_page, publish, clone
  resources :sections (page_sections)      # tworzenie sekcji w motywie (layout sections)
resources :pages                           # CRUD stron custom
  resources :sections (page_sections)      # tworzenie sekcji w stronie
resources :page_sections                   # edit/update/destroy/restore_design_settings_to_defaults
  resources :blocks (page_blocks)          # + member: move_higher, move_lower
    resources :links (page_links)
  resources :links (page_links)
resources :page_links                      # edit/update/destroy
```

Kontrolery (`page_builder/app/controllers/spree/admin/`):

- **`ThemesController`** — `edit` tworzy/odnajduje preview motywu i strony, zapisuje ID w sesji;
  `update_with_page` promuje oba podglądy w jednej transakcji; `publish` ustawia `default: true`;
  `clone` duplikuje motyw.
- **`PageSectionsController`** — `create` waliduje typ sekcji przeciwko
  `available_page_section_types` (allowlist z rejestru, **nie** dowolny `constantize`, co jest ważne
  z punktu widzenia bezpieczeństwa — zob. `df2ca16`/`3a45466` w historii, poprzednie XSS fixe);
  `move_higher`/`move_lower` używają `acts_as_list`; `restore_design_settings_to_defaults` czyści
  wybrany podzbiór preferencji.
- **`PageBlocksController`**, **`PageLinksController`** — analogiczny wzorzec CRUD + reorder.
- **`PagesController`** — CRUD stron custom, po zapisie usuwa `page_preview_id` z sesji.
- **`StorefrontController`** — pojedynczy `resource`, edycja ustawień sklepu (nie edytora per se, ale
  spięty z tym samym layoutem `spree/page_builder`).
- **`Spree::Admin::PageBuilderConcern`** (mixin) — wspólna logika: odczyt podglądów z sesji,
  włączenie Turbo Streams dla `create`/`update`, `default_url_options` propagujące
  `theme_preview_id`/`page_preview_id` do wszystkich linków w widoku.

Autoryzacja: kontrolery dziedziczą z `Spree::Admin::ResourceController`, który (w `spree_admin`,
poza tym repo) obsługuje CanCanCan. W tym repo nie ma customowej logiki autoryzacji poza standardowym
`ResourceController`.

## 7. Stimulus / Hotwire

**Ważne odkrycie**: w tym repozytorium **nie ma zdefiniowanych** kontrolerów Stimulus dla samego
edytora (`page-builder`, `tabs`, `dialog`). Widoki admina (np.
`page_builder/app/views/spree/admin/page_builder/_header.html.erb`) referencują je przez
`data-controller="page-builder tabs dialog"`, ale implementacja JS tych kontrolerów żyje w
zależności `spree_admin` (poza tym repo/forkiem). To repo dostarcza tylko:

- ERB partiale z atrybutami `data-controller`, `data-*-target`, `data-action` (deklaratywne
  podłączenie do zewnętrznych kontrolerów),
  np. `data-page-builder-target="iframe"` (iframe z live-preview), `data-action="click->page-builder#setResponsiveBreakpoint"`.
- Kontroler `page-builder` (zewnętrzny) odbiera komunikaty z iframe podglądu i renderuje
  zmiany na żywo — sam iframe ładuje storefront (`storefront/`) w trybie `page_builder_enabled?`.
- Odświeżanie po zapisie idzie przez **Turbo Streams** (`create_turbo_stream_enabled?` /
  `update_turbo_stream_enabled?` w `PageBuilderConcern`), nie przez ręczny JS fetch.

Stimulus zdefiniowany **w tym repo** (`storefront/app/javascript/spree/storefront/controllers/*.js`,
30 kontrolerów) należy do storefrontu-demo (carousel, cart, checkout, lightbox, itd.) — nie do samego
edytora. Jeden z nich, `prefetch_lazy_controller.js`, jest używany przez `render_section` do lazy
loadingu sekcji (`turbo_frame_tag(..., data: { controller: 'prefetch-lazy' })`).

**Konsekwencja dla dalszej pracy**: rozwijanie *zachowania* edytora (drag&drop, panel boczny, live
preview) w praktyce wymaga zmian po stronie `spree_admin` (zewnętrzny gem) albo dodania nowych,
lokalnych kontrolerów Stimulus w tym repo, jeśli chcemy uniknąć zależności od zmian w `spree_admin`.
Obecnie repo *konsumuje* kontrakt JS zdefiniowany na zewnątrz (nazwy targetów/akcji), nie definiuje go.

## 8. Renderowanie sekcji w storefront

`storefront/app/helpers/spree/page_helper.rb`:

- `render_page(page)` — pobiera `sections` (z podglądu jeśli `current_page_preview` istnieje, inaczej
  z opublikowanej strony), renderuje każdą przez `render_section`, owija w `<main class="page-contents">`.
- `render_section(section, variables, lazy_allowed:)` — trzy tryby renderowania:
  1. **Tryb edycji** (`page_builder_enabled?`) — owija sekcję w `turbo_frame_tag` + `div` z atrybutami
     `data-editor-id`, `data-editor-name`, `data-editor-link` — to jest hak, po którym zewnętrzny JS
     edytora rozpoznaje granice sekcji w iframe podglądu i renderuje nakładki "kliknij, aby edytować".
  2. **Lazy loading** (`section.lazy?`) — `turbo_frame_tag(src: lazy_path, loading: :lazy)`, sekcja
     doładowuje się osobnym requestem (patrz `Spree::PageSectionsController` w `storefront/`, trasa
     `page_section_path`).
  3. **Zwykłe renderowanie** — zwykły `div` z partiałem.
  - Błędy renderowania partiala są łapane i logowane w produkcji (`Rails.error.report`), nie wywalają
    całej strony.
- `to_partial_path` na `PageSection`/`PageBlock` mapuje `type` STI na plik partiala:
  `spree/page_sections/#{type.demodulize.underscore}` — czyli **identyfikator sekcji = nazwa klasy w
  snake_case**, dokładnie zgodnie z konwencją z zadania (`hero`, `rich_text`, `image_banner`, ...).
  Aktualne nazwy w repo to m.in. `image_banner`, `rich_text`, `product_grid`, `featured_taxon`,
  `newsletter` — brakuje jeszcze wprost `hero`, `category_grid`, `testimonials`, `faq` z przykładu w
  briefie (najbliższy odpowiednik `hero` to `image_banner`/`image_with_text`; `category_grid` to
  częściowo `taxon_grid`). Dodanie nowych typów to nowa klasa + partial + wpis w rejestrze
  `page_sections`, bez zmian w `page_helper.rb`.

`storefront/app/helpers/spree/theme_helper.rb` — dostarcza `current_theme`, `current_page`,
`current_theme_preview`, `current_page_preview`, `page_builder_enabled?` (prawda gdy w params jest
`theme_preview_id` lub `page_preview_id`), oraz helpery stylów inline (`section_styles`,
`block_styles`) tłumaczące `preferences` na CSS.

Widoki sekcji: `storefront/app/views/themes/default/spree/page_sections/_*.html.erb` (25 partiali,
1:1 z klasami modeli).

## 9. Motywy i izolacja danych między sklepami

- Każdy `Spree::Theme` ma `belongs_to :store` — twarda izolacja na poziomie FK (bez FK constraint w
  DB, zgodnie z konwencją Spree "no foreign key constraints", ale wymuszane przez scoping w
  kontrolerach: wszystkie query idą przez `current_store.themes`, `current_store.pages`, itd.).
- `Spree::PageBuilder::StoreDecorator` (`page_builder/app/models/spree/page_builder/store_decorator.rb`)
  dopina do `Spree::Store`: `themes`, `theme_previews`, `default_theme`, `theme_pages`, `pages`
  (custom, per-store), oraz automatyczne tworzenie domyślnego motywu i domyślnych taksonomii po
  utworzeniu sklepu (`after_create :create_default_theme`).
- Multi-tenancy jest więc realizowane przez `store_id` na `Theme` i pośrednio przez `pageable`
  (Theme/Store) na `Page`/`PageSection` — nie ma współdzielonych rekordów sekcji/bloków między
  sklepami.
- **Uwaga z pamięci projektu**: zgodnie z wcześniejszymi ustaleniami w innym repo (`sklepik`),
  "multi-store" bywa integrowane na poziomie deploymentu/infrastruktury, nie w tym kodzie — to repo
  samo w sobie już wspiera wiele sklepów (przez `Store`) i wiele motywów na sklep; nie zawiera i nie
  powinno zawierać integracji z zewnętrznym Store Factory.

## 10. Zależność od `spree_storefront`

`spree_page_builder` (gemspec) deklaruje zależność na `spree`, `spree_admin`, `spree_posts` — **nie**
na `spree_storefront`. Zależność w drugą stronę też nie istnieje jako twardy `add_dependency` w kodzie
storefrontu (README mówi, że instalacja `spree_storefront` automatycznie instaluje page buildera przez
generator, ale to jest zależność instalacyjna/dokumentacyjna, nie gemspec).

Faktyczne sprzężenie żyje w warstwie **renderowania**: storefront (`page_helper.rb`, `theme_helper.rb`,
partiale sekcji) zakłada istnienie modeli z `spree_page_builder` (`Spree::Page`, `Spree::PageSection`
itd.) i ich konwencji (`to_partial_path`, `preferred_*`, `role`). To sprzężenie jest zamierzone i
zgodne z briefem — `storefront/` ma pozostać środowiskiem demo/testowym do podglądu edytowanych stron,
nie osobnym produktem.

## 11. Granice modułów (pod kątem przyszłej integracji, bez jej implementowania teraz)

| Warstwa | Lokalizacja | Odpowiedzialność |
|---|---|---|
| Model danych edytora | `page_builder/app/models/spree/{page,page_section,page_block,page_link,theme}.rb` + STI subklasy | Struktura strona→sekcja→blok→link, `preferences` jako płaskie, serializowalne atrybuty |
| Logika zarządzania stronami | `page_builder/app/controllers/spree/admin/*`, `Previewable`, `promote`/`create_preview` | CRUD, workflow preview→publish, reorder (`acts_as_list`) |
| Interfejs wizualnego edytora | `page_builder/app/views/spree/admin/page_builder/*` + zewnętrzne kontrolery Stimulus z `spree_admin` | Panel boczny, drag&drop, live iframe, formularze ustawień |
| Renderowanie sekcji w Storefront | `storefront/app/helpers/spree/{page,theme}_helper.rb`, `storefront/app/views/themes/default/spree/page_sections/*` | Zamiana modelu na HTML, w tym tryb edycji (`data-editor-*`) i lazy loading |

Te granice już dziś są dość czyste (żadna logika biznesowa modelu nie jest wpisana bezpośrednio w
partiale ERB storefrontu — partiale odczytują tylko `preferred_*` i `block_attributes`/`link_attributes`).
To ułatwi w przyszłości wystawienie `preferences` przez API i renderowanie w Next.js bez przepisywania
modelu — ale **to zadanie jawnie nie obejmuje** rozpoczynania tej integracji.

## 12. Rekomendacje na start (bez dużego refaktoru)

Elementy stabilne, nadające się do dalszego rozwijania bez zmian:
- Rejestry rozszerzalności (`Spree.themes/pages/page_sections/page_blocks`).
- Wzorzec preview/promote.
- Konwencja `to_partial_path` / `type.demodulize.underscore` dla identyfikatorów sekcji.
- Płaskie `preferences` jako przyszła baza pod serializację API.

Uwaga: sprawdzono, że zarówno `PageSectionsController#create`, jak i `PageBlocksController#create`
już stosują allowlistę dozwolonych typów (odpowiednio `available_page_section_types` /
`allowed_types`) zamiast dowolnego `constantize`, i oba przypadki mają pokrycie testowe
("when the type is not allowed" w odpowiednich spec). To nie jest więc luka do naprawienia.

Obszary do drobnych, punktowych poprawek (kandydaci na pierwszy PR, patrz też sekcja PR poniżej):
- Brak automatycznego uruchamiania CI na tym forku (Actions nie były jeszcze odpalone) — do
  włączenia po stronie ustawień repo na GitHubie (nie jest to zmiana w kodzie).
- Drobne niedociągnięcia kosmetyczne w kodzie (np. końcowe białe znaki, podwójne puste linie) —
  niskiego ryzyka, ale też niskiej wartości jako samodzielny PR.
