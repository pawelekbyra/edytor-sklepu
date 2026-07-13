# Architektura nowego edytora (TypeScript / React / Next.js)

> Dokument opisuje docelową architekturę samodzielnej, niezależnej implementacji wizualnego edytora
> stron w TypeScript. Pełne uzasadnienie decyzji i mapowanie funkcjonalności: patrz
> [`docs/MACIERZ_ZGODNOSCI.md`](MACIERZ_ZGODNOSCI.md).

## Cel

Samodzielna aplikacja edytora stron/motywów/sekcji/bloków w TypeScript, uruchamialna niezależnie,
z rdzeniem domenowym odseparowanym od frameworka UI i od konkretnej bazy danych — tak, żeby
docelowe podłączenie do API `sklepik` wymagało tylko podmiany implementacji repozytoriów, nie
przepisywania logiki edytora.

To repo pozostaje odizolowane: brak integracji z `sklepik`, `sklepikFront`, Store Factory. Dane
komercyjne (produkty, kategorie) są dostarczane przez `CommerceProvider` z implementacją demo.

## Struktura monorepo

```
edytor-sklepu/
├── docs/
│   ├── ARCHITEKTURA.md                  # ten plik — docelowa architektura
│   └── MACIERZ_ZGODNOSCI.md             # mapowanie stare feature -> nowe odpowiedniki
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── apps/
│   └── editor/                          # Next.js — UI edytora
└── packages/
    ├── schema/          # Zod schematy + typy TS
    ├── editor-core/     # komendy, undo/redo, walidacja (bez React)
    ├── persistence/     # interfejsy repozytoriów + implementacja SQLite demo
    ├── renderer/        # rejestr typ→komponent, renderPage/renderSection
    └── component-library/ # komponenty React
```

Zależności są jednokierunkowe (bez cykli): `schema` jest liściem, na którym opierają się pozostałe
pakiety; `apps/editor` jest jedynym miejscem, które zna wszystkie pakiety naraz.

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
  `BlockSchema`, `PageVersionSchema`.
- Eksportuje również wywnioskowane typy TS.
- Zero zależności od innych pakietów i od Reacta/Next.js/bazy danych.
- Odpowiednik tabel SQL — spłaszczony do jednego, wersjonowalnego dokumentu JSON.

### `packages/editor-core`
- Wzorzec komend: każda mutacja (dodaj sekcję, przesuń blok, zmień ustawienie, opublikuj)
  to obiekt `Command` z metodami `do(state)`/`undo(state)`.
- `CommandStack` — czysta klasa TS (bez zależności od Reacta), testowalna w izolacji.
- Walidacja: każda komenda waliduje wejście przez `packages/schema` przed wykonaniem.
- Logika draft/publish, undo/redo, reorder sekcji/bloków.

### `packages/persistence`
- Interfejsy: `PageRepository`, `ThemeRepository`, `VersionRepository`, `MediaRepository`,
  `CommerceProvider` — wszystkie operacje wymagają `storeId` (izolacja między sklepami).
- Domyślna implementacja: `better-sqlite3`, plik `.data/editor.db`.
- `CommerceProvider` zwraca dane demo (nie przepisujemy commerce).
- Jedyne miejsce, które później zostanie podmienione na klienta API `sklepik`.

### `packages/renderer`
- Rejestr `registerSection(type, Component)` / `registerBlock(type, Component)`.
- `renderPage(page, { mode })` i `renderSection(section, { mode })`.
- Funkcje `sectionStyles()`/`blockStyles()` (preferencje → CSS).
- Współdzielony między edytorem a przyszłym storefrontem Next.js.

### `packages/component-library`
- Komponenty React: `Hero`, `Header`, `Footer`, `ProductGrid`, `CategoryGrid`, `ImageBanner`,
  `RichText`, `Newsletter`, `Testimonials`, `FAQ`, `Video`, `Spacer`, `Columns`, `Button`,
  `Image`, `Navigation`.
- Czysto prezentacyjne, zero logiki biznesowej.

### `apps/editor`
- Next.js App Router. Canvas (drag&drop przez `@dnd-kit`) → panel właściwości → live preview →
  pasek draft/publish/historia.
- Stan edytora: `editor-core` `CommandStack` opakowany hookiem `useEditorStore`.

## Format dokumentu strony

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

- **pnpm workspaces** — bez Turborepo na start.
- **TypeScript strict mode** wszędzie.
- **Vitest** — testy jednostkowe we wszystkich pakietach.
- **React Testing Library** — testy komponentów.
- **Playwright** — end-to-end demo flow.
- **@dnd-kit/core** — drag & drop w canvasie.
- **better-sqlite3** — persystencja demo.

## Co NIE wchodzi w zakres

- Prawdziwa logika commerce (koszyk, checkout, płatności) — tylko demo.
- Integracja z `sklepik`, `sklepikFront`, Store Factory, dashboardem React.
- Storefront Next.js — to osobny, przyszły projekt; `packages/renderer` jest projektowany
  żeby to umożliwić.
