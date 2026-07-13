# Architektura edytora (TypeScript / React / Next.js)

> Dokument opisuje zarówno bieżący stan rewrite'u, jak i docelową architekturę samodzielnego
> wizualnego edytora stron. Szczegółowy status każdej funkcji znajduje się w
> [`MACIERZ_ZGODNOSCI.md`](MACIERZ_ZGODNOSCI.md).

## Stan obecny

Repozytorium zostało przepisane z Railsowego `spree_page_builder` na monorepo TypeScript.
Stare katalogi `page_builder/`, `storefront/` i `lib/` zostały usunięte i nie są aktywną
implementacją.

Obecnie istnieją:

- konfiguracja pnpm workspaces i TypeScript,
- `packages/schema` ze schematami Zod, typami i testami,
- dokumentacja architektury oraz macierz zgodności,
- placeholder `apps/editor`.

Obecnie **nie istnieją jeszcze** działające pakiety `editor-core`, `persistence`, `renderer` ani
`component-library`. Nie ma również canvasa, live preview, draft/publish, mediów ani produkcyjnej
integracji z `sklepik` lub `sklepikFront`.

Poniższe sekcje opisują architekturę docelową. Oznaczenie „planowane” nie oznacza, że katalog lub
implementacja już istnieje.

## Cel

Samodzielna aplikacja edytora stron, motywów, sekcji i bloków w TypeScript, uruchamialna
niezależnie, z rdzeniem domenowym odseparowanym od frameworka UI i konkretnej bazy danych.
Docelowe podłączenie do API `sklepik` powinno wymagać podmiany adapterów repozytoriów, a nie
przepisywania logiki edytora.

Do czasu integracji repo pozostaje samodzielne. Dane commerce, takie jak produkty i kategorie,
będą dostarczane przez interfejs `CommerceProvider`: początkowo z implementacji demo, a później
przez Store/Admin API `sklepik`.

## Struktura monorepo

```text
edytor-sklepu/
├── docs/
│   ├── ARCHITEKTURA.md                  # ten plik
│   ├── MACIERZ_ZGODNOSCI.md             # rzeczywisty status funkcji
│   └── INSTRUKCJA_INTEGRACJI.md         # plan integracji ze sklepik
├── pnpm-workspace.yaml                  # istnieje
├── package.json                         # istnieje
├── tsconfig.base.json                   # istnieje
├── apps/
│   └── editor/                          # istnieje jako placeholder; UI planowane
└── packages/
    ├── schema/                          # istnieje
    ├── editor-core/                     # planowane
    ├── persistence/                     # planowane
    ├── renderer/                        # planowane
    └── component-library/               # planowane
```

Docelowe zależności są jednokierunkowe i nie tworzą cykli. `schema` jest najniższą warstwą,
a `apps/editor` jest miejscem kompozycji wszystkich pakietów.

```text
        schema
       /   |   \
editor-core persistence  component-library
       \   |   /              |
        \  |  /             renderer
       apps/editor  ←───────────┘
```

## Pakiety i odpowiedzialności

### `packages/schema` — istnieje

- Zod schemas: `PageSchema`, `ThemeSchema`, `SectionSchema`, `BlockSchema`, `PageVersionSchema`.
- Typy TypeScript wywnioskowane ze schematów.
- Brak zależności od Reacta, Next.js i bazy danych.
- Kontrakt wersjonowalnego dokumentu JSON.
- Testy wartości domyślnych, dyskryminowanych typów i podstawowej walidacji.

### `packages/editor-core` — planowane

- Wzorzec komend dla każdej mutacji dokumentu.
- `CommandStack` z `do`, `undo` i `redo`.
- Walidacja wejścia przez `packages/schema`.
- Reorder sekcji i bloków.
- Logika stanu edytora niezależna od Reacta.

Draft/publish i historia wersji powinny być koordynowane przez core, ale atomowy zapis i publikacja
należą do warstwy persistence/backendu.

### `packages/persistence` — planowane

- Interfejsy `PageRepository`, `ThemeRepository`, `VersionRepository`, `MediaRepository` oraz
  `CommerceProvider`.
- Wszystkie operacje wymagają kontekstu `storeId`.
- Implementacja demo może używać `better-sqlite3` i `.data/editor.db`.
- Implementacja produkcyjna będzie adapterem API `sklepik` i pozostanie w tym repo/pakiecie,
  zamiast tworzyć drugi serwer TypeScript w repo Rails.

### `packages/component-library` — planowane

Prezentacyjne komponenty React, między innymi:

- `Hero`, `Header`, `Footer`,
- `ProductGrid`, `CategoryGrid`,
- `ImageBanner`, `RichText`, `Newsletter`,
- `Testimonials`, `FAQ`, `Video`,
- `Spacer`, `Columns`, `Button`, `Image`, `Navigation`.

Komponenty nie zawierają logiki koszyka, checkoutu, płatności ani zamówień.

### `packages/renderer` — planowane

- rejestr `registerSection(type, Component)` i `registerBlock(type, Component)`,
- `renderPage(document, context)` i `renderSection(section, context)`,
- mapowanie preferencji stylu na bezpieczne właściwości/CSS,
- tryby `editor`, `preview` i `live`,
- wspólny renderer dla podglądu edytora i storefrontu Next.js.

Ta współdzielona warstwa jest kluczowa: preview nie powinno mieć osobnej implementacji wyglądu niż
opublikowana strona.

### `apps/editor` — placeholder, UI planowane

Docelowa aplikacja Next.js App Router:

- canvas z drag & drop przez `@dnd-kit`,
- wybór sekcji i bloków,
- panel właściwości generowany ze schematów,
- live preview w iframe,
- pasek draft/publish i historia wersji,
- biblioteka mediów i zarządzanie motywami.

## Format dokumentu strony

Poniższy przykład jest formatem docelowym; ostatecznym źródłem prawdy pozostają schematy w
`packages/schema`.

```ts
type PageDocument = {
  id: string;
  storeId: string;
  type: PageType;
  themeId: string;
  sections: SectionInstance[];
};

type SectionInstance = {
  id: string;
  type: SectionType;
  position: number;
  preferences: Record<string, string | number | boolean | null>;
  blocks?: BlockInstance[];
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

## Narzędzia

### Używane obecnie

- pnpm workspaces,
- TypeScript w trybie strict,
- Zod,
- Vitest.

### Planowane wraz z kolejnymi pakietami

- React i Next.js,
- React Testing Library,
- Playwright,
- `@dnd-kit/core`,
- `better-sqlite3` dla lokalnej implementacji demo.

## Granice systemu

Edytor nie implementuje prawdziwej logiki commerce. Produkty, ceny, zapasy, koszyk, checkout,
płatności, klienci i zamówienia pozostają odpowiedzialnością `sklepik`.

Repo nie jest drugim storefrontem. `sklepikFront` pozostaje aplikacją klienta, a w przyszłości może
konsumować opublikowane dokumenty oraz `packages/renderer`.

Integracja z `sklepik`, panelem administracyjnym i Store Factory jest planowana, ale nie działa
jeszcze w aktualnym kodzie. Plan integracji opisuje [`INSTRUKCJA_INTEGRACJI.md`](INSTRUKCJA_INTEGRACJI.md).
