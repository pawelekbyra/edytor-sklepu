# Integracja edytora z `pawelekbyra/sklepik`

Dokument opisuje docelowe połączenie repozytorium `pawelekbyra/edytor-sklepu` z backendem i
panelem administracyjnym `pawelekbyra/sklepik` oraz storefrontem `pawelekbyra/sklepikFront`.

To jest plan techniczny. Integracja nie działa jeszcze w aktualnym kodzie.

## Stan obecny

### Gotowe w `edytor-sklepu`

- monorepo pnpm i konfiguracja TypeScript,
- `packages/schema` ze schematami Zod i typami,
- 16 kanonicznych typów sekcji,
- testy schematów,
- dokumentacja architektury i macierz zgodności.

### Jeszcze niegotowe

- `packages/editor-core`,
- `packages/persistence`,
- `packages/component-library`,
- `packages/renderer`,
- aplikacja Next.js w `apps/editor`,
- persistence, draft/publish i historia,
- API stron i motywów w `sklepik`,
- renderowanie dokumentów w `sklepikFront`.

Railsowy storefront i `spree_page_builder` zostały usunięte z tego repo. TypeScript jest jedyną
aktywną implementacją, ale właściwy wizualny edytor nie został jeszcze ukończony.

## Zasada integracji

System powinien mieć trzy wyraźne warstwy:

```text
edytor-sklepu
  → UI edytora, model dokumentu, komendy, renderer i adaptery API

sklepik
  → Rails/Spree: persistence, autoryzacja, store scope, media i Admin/Store API

sklepikFront
  → Next.js: pobiera opublikowaną wersję i renderuje ją dla klienta
```

Najważniejsze zasady:

1. `sklepik` pozostaje źródłem prawdy dla danych produkcyjnych.
2. `edytor-sklepu` nie uruchamia drugiego serwera commerce.
3. Adapter API implementujący interfejsy repozytoriów znajduje się w `edytor-sklepu`.
4. Backend Rails udostępnia zasoby stron, wersji, motywów i mediów.
5. Preview edytora i storefront używają tego samego `packages/renderer`.
6. Storefront pobiera wyłącznie wersje opublikowane; drafty są dostępne tylko po autoryzacji preview.

## Kolejność realizacji

### Etap A — pionowy scenariusz lokalny

Najpierw należy uruchomić minimalny przepływ bez integracji produkcyjnej:

```text
utworzenie strony
→ dodanie sekcji hero/rich_text/product_grid
→ zapis draftu w SQLite
→ preview
→ publikacja
→ ponowne otwarcie opublikowanej wersji
```

Zakres:

- `packages/editor-core`,
- `packages/persistence` z SQLite,
- `packages/component-library` z 3 sekcjami,
- `packages/renderer`,
- minimalne `apps/editor`,
- test integracyjny i Playwright.

Dopiero po działającym pionowym scenariuszu warto dodawać wszystkie pozostałe typy sekcji.

### Etap B — persistence i wersjonowanie

Planowane interfejsy:

```ts
export interface PageRepository {
  create(storeId: string, page: Page): Promise<Page>;
  read(storeId: string, pageId: string): Promise<Page | null>;
  update(storeId: string, pageId: string, updates: Partial<Page>): Promise<Page>;
  delete(storeId: string, pageId: string): Promise<void>;
  listByStore(storeId: string): Promise<Page[]>;
}

export interface VersionRepository {
  saveDraft(
    storeId: string,
    pageId: string,
    document: PageDocument,
  ): Promise<PageVersion>;

  publish(storeId: string, pageId: string): Promise<PageVersion>;
  getVersion(storeId: string, versionId: string): Promise<PageVersion>;
  listVersions(storeId: string, pageId: string): Promise<PageVersion[]>;
}

export interface ThemeRepository {
  create(storeId: string, theme: Theme): Promise<Theme>;
  read(storeId: string, themeId: string): Promise<Theme | null>;
  update(storeId: string, themeId: string, updates: Partial<Theme>): Promise<Theme>;
  delete(storeId: string, themeId: string): Promise<void>;
  listByStore(storeId: string): Promise<Theme[]>;
  setDefault(storeId: string, themeId: string): Promise<void>;
}

export interface MediaRepository {
  upload(storeId: string, file: File): Promise<{ id: string; url: string }>;
  delete(storeId: string, mediaId: string): Promise<void>;
  listByStore(storeId: string): Promise<Media[]>;
}

export interface CommerceProvider {
  getProducts(storeId: string): Promise<Product[]>;
  getCategories(storeId: string): Promise<Category[]>;
}
```

Implementacje:

- `SQLite*Repository` — lokalny development i testy,
- `Sklepik*Repository` — klient Admin API `sklepik`,
- `SklepikCommerceProvider` — klient Store/Admin API produktów i kategorii.

`apps/editor` zna wyłącznie interfejsy. Konkretny zestaw adapterów jest przekazywany przy
inicjalizacji aplikacji.

## Backend w `pawelekbyra/sklepik`

`sklepik` jest monorepo Rails/Spree, dlatego nie należy dodawać do niego fikcyjnej struktury
`src/api` ani osobnego serwera persistence w TypeScript.

Docelowy kształt może wyglądać następująco:

```text
spree/core/
├── app/models/spree/editor_page.rb
├── app/models/spree/editor_page_version.rb
├── app/models/spree/editor_theme.rb
└── db/migrate/...

spree/api/
├── app/controllers/spree/api/v3/admin/editor_pages_controller.rb
├── app/controllers/spree/api/v3/admin/editor_themes_controller.rb
├── app/controllers/spree/api/v3/admin/editor_media_controller.rb
├── app/controllers/spree/api/v3/store/editor_pages_controller.rb
└── app/serializers/spree/api/v3/...

packages/admin-sdk/
└── zasoby pages/themes/versions/media

packages/dashboard/
└── trasa lub osadzenie aplikacji edytora
```

Nazwy modeli i tras są propozycją. Przed implementacją należy sprawdzić konwencje istniejącego
Admin API v3, serializerów, autoryzacji i generowania typów w `sklepik`.

## Store scope i autoryzacja

Admin API `sklepik` rozwiązuje aktywny sklep z kontekstu panelu, między innymi przez
`X-Spree-Store-Id`. Endpointy edytora powinny korzystać z `current_store`, a nie ufać dowolnemu
`storeId` przesłanemu w body.

Każde zapytanie musi być ograniczone do aktywnego sklepu:

- strony,
- wersje,
- motywy,
- media,
- powiązania z produktami i kategoriami.

Store API może zwracać wyłącznie opublikowaną wersję strony należącą do sklepu rozwiązanego przez
host/publishable key. Drafty i historia nie mogą być publicznie dostępne.

## Proponowany kontrakt API

Poniższe ścieżki są propozycją do dopasowania do konwencji `sklepik`.

### Admin API

```text
GET    /api/v3/admin/editor/pages
POST   /api/v3/admin/editor/pages
GET    /api/v3/admin/editor/pages/:id
PATCH  /api/v3/admin/editor/pages/:id
DELETE /api/v3/admin/editor/pages/:id

POST   /api/v3/admin/editor/pages/:id/draft
POST   /api/v3/admin/editor/pages/:id/publish
GET    /api/v3/admin/editor/pages/:id/versions
GET    /api/v3/admin/editor/versions/:id

GET    /api/v3/admin/editor/themes
POST   /api/v3/admin/editor/themes
GET    /api/v3/admin/editor/themes/:id
PATCH  /api/v3/admin/editor/themes/:id
DELETE /api/v3/admin/editor/themes/:id
POST   /api/v3/admin/editor/themes/:id/set_default

GET    /api/v3/admin/editor/media
POST   /api/v3/admin/editor/media
DELETE /api/v3/admin/editor/media/:id
```

### Store API

```text
GET /api/v3/store/editor/pages/:slug
GET /api/v3/store/editor/theme
```

Store API powinno zwracać gotowy dokument opublikowanej wersji wraz z identyfikatorem wersji lub
ETag potrzebnym do cache i rewalidacji.

## Adapter API w `edytor-sklepu`

Adapter produkcyjny należy umieścić w planowanym `packages/persistence`, na przykład:

```text
packages/persistence/src/
├── repositories/
│   ├── PageRepository.ts
│   ├── VersionRepository.ts
│   ├── ThemeRepository.ts
│   └── MediaRepository.ts
├── sqlite/
│   └── ...
└── sklepik/
    ├── SklepikPageRepository.ts
    ├── SklepikVersionRepository.ts
    ├── SklepikThemeRepository.ts
    ├── SklepikMediaRepository.ts
    └── SklepikCommerceProvider.ts
```

Przykład:

```ts
export class SklepikPageRepository implements PageRepository {
  constructor(private api: SklepikAdminApi) {}

  async read(_storeId: string, pageId: string): Promise<Page | null> {
    return this.api.get(`/api/v3/admin/editor/pages/${pageId}`);
  }
}
```

`storeId` pozostaje częścią interfejsu dla izolacji i implementacji demo, ale adapter produkcyjny
powinien ustawiać zatwierdzony kontekst sklepu w nagłówku klienta API.

## Integracja z panelem administracyjnym

Możliwe warianty:

1. `apps/editor` jako osobna aplikacja Vercel otwierana z dashboardu,
2. osadzenie przez chronioną trasę/iframe,
3. późniejsze wydzielenie komponentów UI i montowanie ich bezpośrednio w `packages/dashboard`.

Na start najprostsza jest osobna aplikacja korzystająca z tego samego JWT/proxy lub bezpiecznej,
krótkotrwałej sesji edytora. Nie należy przekazywać trwałych tokenów w query stringu.

## Integracja ze `sklepikFront`

Storefront pobiera opublikowany dokument z Store API i renderuje go przez wspólny renderer:

```tsx
import { renderPage } from "@sklepik/editor-renderer";

export default async function CustomPage({ params }: PageProps) {
  const { slug } = await params;
  const publishedPage = await getPublishedEditorPage(slug);

  return renderPage(publishedPage.document, {
    mode: "live",
    storeId: publishedPage.storeId,
  });
}
```

Produkty i kategorie w sekcjach dynamicznych są pobierane przez adapter commerce/storefrontu, a nie
zapisywane jako pełne kopie danych produktu w dokumencie strony.

Publikacja powinna uruchamiać webhook lub tag-based revalidation w `sklepikFront`.

## Dystrybucja pakietów

`workspace:*` działa tylko wewnątrz jednego workspace. Ponieważ `edytor-sklepu`, `sklepik` i
`sklepikFront` są osobnymi repozytoriami, produkcyjna integracja wymaga wersjonowanych pakietów.

Preferowany kierunek:

- GitHub Packages lub prywatny rejestr npm,
- semver dla `schema`, `renderer` i ewentualnie `component-library`,
- zgodność kontraktu zapisana i testowana pomiędzy wersją backendu a rendererem.

Bezpośrednia zależność `github:...#main` może być używana tymczasowo w eksperymencie, ale nie
powinna być docelowym mechanizmem produkcyjnym.

## Kryterium gotowości integracji

- [ ] działa lokalny pionowy scenariusz draft → preview → publish,
- [ ] `packages/editor-core` ma testy undo/redo,
- [ ] persistence ma testy CRUD, transakcji i izolacji sklepów,
- [ ] preview i renderer live przechodzą wspólne snapshot/component tests,
- [ ] aplikacja edytora ma E2E Playwright,
- [ ] backend Rails ma modele, migracje, autoryzację i Admin/Store API,
- [ ] `Sklepik*Repository` przechodzi testy kontraktowe,
- [ ] dashboard otwiera edytor dla właściwego sklepu,
- [ ] storefront renderuje opublikowany dokument,
- [ ] publikacja odświeża cache storefrontu,
- [ ] drafty nie są dostępne przez publiczne Store API,
- [ ] macierz zgodności odzwierciedla rzeczywisty stan implementacji.

## Odpowiedzi na częste pytania

**Czy edytor jest już przepisany na TypeScript?**  
Tak — Rails został usunięty, a aktywne repo jest TypeScriptowe. Ukończony jest jednak fundament i
schema, nie cały wizualny edytor.

**Czy undo/redo już działa?**  
Nie. `CommandStack` i komendy są nadal planowane.

**Czy istnieje live preview?**  
Nie. Powstanie po wdrożeniu component library i renderera.

**Czy integracja ze `sklepik` już działa?**  
Nie. Ten dokument opisuje plan oraz granice odpowiedzialności.
