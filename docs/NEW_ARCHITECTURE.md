# Architektura nowego edytora (TypeScript / React / Next.js)

> Dokument opisuje docelową architekturę **nowej**, niezależnej implementacji wizualnego edytora
> stron, zastępującej `spree_page_builder` (Rails). Kontekst decyzji i pełne uzasadnienie: patrz plan
> zapisany w tej sesji oraz [`docs/COMPATIBILITY_MATRIX.md`](COMPATIBILITY_MATRIX.md) dla zgodności
> funkcjonalnej ze starym kodem, który pozostaje w repo jako referencja aż do etapu 13.

## Cel

Samodzielna aplikacja edytora stron/motywów/sekcji/bloków w TypeScript, uruchamialna niezależnie od
Rails, z rdzeniem domenowym odseparowanym od frameworka UI i od konkretnej bazy danych — tak, żeby
docelowe podłączenie do API `sklepik` wymagało tylko podmiany implementacji repozytoriów, nie
przepisywania logiki edytora.

To repo pozostaje odizolowane: brak integracji z `sklepik`, `sklepikFront`, Store Factory. Dane
komercyjne (produkty, kategorie) są dostarczane przez `CommerceProvider` z implementacją demo.

## Struktura monorepo

```
edytor-sklepu/
├── page_builder/, storefront/     # Rails — niezmienione, referencja funkcjonalna
├── pnpm-workspace.yaml
├── package.json                    # root: skrypty `build`/`test`/`lint` uruchamiane przez pnpm -r
├── tsconfig.base.json               # wspólna konfiguracja TS (strict: true)
├── apps/
│   └── editor/                      # Next.js App Router
└── packages/
    ├── schema/          # zależy od: (nic) — Zod schematy i typy, źródło prawdy dla kształtu dokumentu
    ├── editor-core/       # zależy od: schema — komendy, undo/redo, walidacja, stan edytora (bez React)
    ├── persistence/         # zależy od: schema — interfejsy repozytoriów + implementacja SQLite demo
    ├── renderer/             # zależy od: schema, component-library — rejestr typ→komponent, renderPage/renderSection
    └── component-library/     # zależy od: schema, React — komponenty prezentacyjne (Hero, Header, ...)
```

Zależności są jednokierunkowe (bez cykli): `schema` jest liściem, na którym opierają się wszystkie
pozostałe pakiety; `apps/editor` jest jedynym miejscem, które zna wszystkie pakiety naraz.

```
        schema
       /   |   \
editor-core persistence  component-library
       \   |   /              |
        \  |  /             renderer
       apps/editor  ←───────────┘
```

## Pakiety — odpowiedzialności

### `packages/schema`
- Zod schematy: `PageSchema`, `ThemeSchema`, `SectionSchema` (discriminated union po `type`),
  `BlockSchema` (discriminated union po `type`), `PageLinkSchema`, `PageVersionSchema`.
- Eksportuje też wywnioskowane typy TS (`z.infer<typeof PageSchema>`).
- Zero zależności od innych pakietów w monorepo i zero zależności od Reacta/Next.js/bazy danych.
- To jest odpowiednik kolumn `type` + `preferences` z migracji Rails
  (`page_builder/db/migrate/20250120094216_create_page_builder_models.rb`) — ale spłaszczony do
  jednego, wersjonowalnego dokumentu JSON zamiast znormalizowanych tabel SQL.

### `packages/editor-core`
- Wzorzec komend: każda mutacja (dodaj sekcję, przesuń blok, zmień preferencję, opublikuj) to obiekt
  `Command` z metodami `do(state)`/`undo(state)`, rejestrowany na stosie undo/redo.
- `CommandStack` — czysta klasa TS (brak zależności od Reacta), testowalna w izolacji.
- Walidacja: każda komenda waliduje wejście przez `packages/schema` przed wykonaniem (odpowiednik
  allowlisty typów z `PageSectionsController`/`PageBlocksController` w Rails).
- Odpowiednik logiki z `Spree::Previewable`, `Page#promote`, `Theme#promote`, `acts_as_list`.

### `packages/persistence`
- Interfejsy: `PageRepository`, `ThemeRepository`, `VersionRepository`, `MediaRepository`,
  `CommerceProvider` — wszystkie operacje przyjmują `storeId` (odpowiednik `Theme belongs_to :store`
  w Rails, wymuszający izolację między sklepami).
- Domyślna implementacja: `better-sqlite3`, lokalny plik `.data/editor.db` — wystarczające do demo i
  testów integracyjnych, bez zależności od zewnętrznych usług.
- `CommerceProvider` (produkty/kategorie) ma implementację demo zwracającą dane z fixtures — **nie**
  przepisujemy Spree Commerce.
- To jest jedyne miejsce w monorepo, które później zostanie podmienione na klienta API `sklepik` —
  reszta pakietów zna tylko interfejsy z `packages/persistence`, nigdy konkretną implementację.

### `packages/renderer`
- Rejestr `registerSection(type, Component)` / `registerBlock(type, Component)`.
- `renderPage(page, { mode })` i `renderSection(section, { mode })` — odpowiednik
  `render_page`/`render_section` z `storefront/app/helpers/spree/page_helper.rb`, w tym 3 tryby
  (`edit`/`lazy`/`live` — odpowiednik `page_builder_enabled?`/`section.lazy?`/zwykłego renderowania).
- Funkcje `sectionStyles()`/`blockStyles()` (preferencje → `CSSProperties`) — odpowiednik
  `section_styles`/`block_styles` z `theme_helper.rb`.
- Współdzielony między `apps/editor` (canvas + live preview) a przyszłym storefrontem Next.js
  (poza zakresem tego repo na razie, ale to jest właśnie ten punkt integracji, o który chodziło w
  briefie: "wspólny kod dla edytora i przyszłego storefrontu").

### `packages/component-library`
- Komponenty React 1:1 z listą z briefu: `Hero`, `Header`, `Footer`, `ProductGrid`, `CategoryGrid`,
  `ImageBanner`, `RichText`, `Newsletter`, `Testimonials`, `FAQ`, `Video`, `Spacer`, `Columns`,
  `Button`, `Image`, `Navigation`.
- Każdy komponent: czysto prezentacyjny, przyjmuje `props` zwalidowane przez odpowiedni Zod schema z
  `packages/schema`, zero logiki biznesowej, zero zależności od `editor-core`/`persistence`.
- Mapowanie na stare typy sekcji Rails — patrz `docs/COMPATIBILITY_MATRIX.md` sekcja 3.

### `apps/editor`
- Next.js App Router. Jedyna aplikacja z zależnością na wszystkie pakiety naraz.
- Struktura ekranów: lista motywów/stron → canvas (drag&drop przez `@dnd-kit`) → panel właściwości
  (formularz generowany ze schema sekcji/bloku) → panel live preview (renderowany przez
  `packages/renderer` w trybie `edit`) → pasek draft/publish/historia.
- Stan edytora: `editor-core` `CommandStack` opakowany cienkim hookiem `useEditorStore` (Zustand albo
  `useSyncExternalStore` — wybór biblioteki state nie jest krytyczny, `editor-core` nie zależy od
  żadnej z nich).

## Format dokumentu strony (szkic)

```ts
type PageDocument = {
  id: string;
  storeId: string;
  type: PageType; // "homepage" | "custom" | "product-details" | ...
  themeId: string;
  sections: SectionInstance[]; // uporządkowane po position
};

type SectionInstance = {
  id: string;
  type: SectionType; // "hero" | "rich_text" | "product_grid" | ...
  position: number;
  preferences: Record<string, string | number | boolean | null>;
  blocks?: BlockInstance[]; // tylko sekcje z blocksAvailable
  links?: PageLinkInstance[];
};

type BlockInstance = {
  id: string;
  type: BlockType;
  position: number;
  preferences: Record<string, string | number | boolean | null>;
};

type PageVersion = {
  id: string;
  pageId: string;
  status: "draft" | "published";
  document: PageDocument;
  createdAt: string;
  publishedAt?: string;
};
```

To bezpośrednio odzwierciedla model Rails (`Page`/`PageSection`/`PageBlock`/`PageLink`, `preferences`
jako płaskie skalary) — patrz `docs/COMPATIBILITY_MATRIX.md` sekcja 1 dla szczegółowego mapowania
pole-po-polu.

## Narzędzia

- **pnpm workspaces** — bez Turborepo na start; można dodać, jeśli liczba pakietów/czas builda
  zacznie tego wymagać.
- **TypeScript strict mode** wszędzie, `tsconfig.base.json` rozszerzany przez każdy pakiet.
- **Vitest** — testy jednostkowe we wszystkich pakietach (`packages/*/test/**/*.test.ts`).
- **React Testing Library** — testy komponentów w `component-library` i interakcji w `apps/editor`.
- **Playwright** — end-to-end demo flow, dopiero gdy `apps/editor` ma minimalny działający UI
  (etap 6+), pełny scenariusz dopiero w etapie 13 jako warunek usunięcia Rails.
- **@dnd-kit/core** — drag & drop w canvasie.
- **better-sqlite3** — persystencja demo.

## Co NIE wchodzi w zakres tego repo

- Prawdziwa logika commerce (koszyk, checkout, płatności, magazyn) — tylko `CommerceProvider` z
  danymi demo.
- Integracja z `pawelekbyra/sklepik`, `pawelekbyra/sklepikFront`, Store Factory, dashboardem React.
- Storefront Next.js konsumujący `packages/renderer` — to osobny, przyszły projekt; `packages/renderer`
  jest projektowany tak, żeby to umożliwić, ale nie jest tu budowany.
