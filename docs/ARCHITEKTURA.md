# Architektura nowego edytora (TypeScript / React / Next.js)

> Dokument opisuje docelową architekturę samodzielnej, niezależnej implementacji wizualnego edytora
> stron w TypeScript. Pełne uzasadnienie decyzji i mapowanie funkcjonalności: patrz
> [`docs/MACIERZ_ZGODNOSCI.md`](MACIERZ_ZGODNOSCI.md).

## Cel

Samodzielna aplikacja edytora stron/motywów/sekcji/bloków w TypeScript, uruchamialna niezależnie,
z rdzeniem domenowym odseparowanym od frameworka UI i od konkretnej bazy danych — tak, żeby
docelowe podłączenie do API `sklepik` wymagało tylko podmiany implementacji repozytoriów, nie
przepisywania logiki edytora.

**Decyzja właściciela (2026-07-16):** docelowo każdy nowy sklep tworzony w Store Factory ma mieć
ten edytor — zarówno w trybie `managed` (współdzielony runtime), jak i w trybie „własne repo"
(pełna niezależność kodu). Zobacz sekcję „Dystrybucja" niżej. Na obecnym etapie prac (Etapy 1–4)
repo nadal rozwija się w izolacji — bez importu do `sklepik`/`sklepikFront` — ale interfejsy
(`packages/persistence`, `registerSection`/`registerBlock`) są projektowane pod kątem tej docelowej
dystrybucji, nie tylko demo. Dane komercyjne (produkty, kategorie) są dostarczane przez
`CommerceProvider` z implementacją demo, docelowo podmienianą na klienta Store API `sklepik`.

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

## Dystrybucja: jeden pakiet, dwa tryby (`managed` / własne repo)

**Decyzja (2026-07-16):** edytor + renderer są dystrybuowane jako jeden wersjonowany pakiet npm
(docelowa nazwa: `@editor/*` → `@sklepik/page-builder` po integracji), zamiast osobnej aplikacji
per tryb. Canvas, panel właściwości, `CommandStack` (undo/redo) i standardowa biblioteka sekcji z
`packages/component-library` są **identyczne** w obu trybach Store Factory. Jedyna różnica to które
repo woła `registerSection()`/`registerBlock()` i jaka implementacja `PageRepository`/`storeId`
stoi pod spodem:

| | Tryb `managed` (współdzielony runtime) | Tryb „własne repo" (Store Factory, pełna niezależność) |
|---|---|---|
| Kto woła `registerSection()`/`registerBlock()` | Tylko platforma (jeden shared runtime obsługuje wiele sklepów) | Właściciel repo / jego deweloper, z własnym kodem, zależnościami, stylami |
| Biblioteka sekcji | Tylko standardowa (`component-library`) | Standardowa + dowolne własne komponenty |
| `PageRepository` / dane | Jedna implementacja API, `storeId` jako scope w każdym zapytaniu | Właściciel implementuje własną (własna baza/API), pełny dostęp do własnych danych |
| Sandbox / review kodu | Nie dotyczy właściciela sklepu (nie ma dostępu do kodu) | **Brak sandboxa** — patrz uzasadnienie niżej |

**Custom code w trybie „własne repo" — bez sandboxa, pełny dostęp.** Sens Store Factory dającego
osobne repo + osobny deployment to prawdziwa niezależność: właściciel może w każdej chwili wynająć
dewelopera i zrobić z kodem co chce. Ograniczenie go do samej biblioteki edytora mimo własnego repo
przenosiłoby ograniczenie w inne miejsce, nie usuwałoby go. Sandboxing/custom-code-review ma sens
**tylko** w trybie `managed`, bo tam wiele sklepów dzieli jeden proces i kod jednego mógłby zagrozić
drugiemu — w trybie własnego repo nie ma współdzielonego runtime'u do ochrony, więc to zbędne. Stąd
punkt „Custom code sandbox" z wcześniejszej wizji (`storefront-composition-system.md` w repo
`sklepik`) dotyczy wyłącznie trybu `managed`, nie własnego repo.

Konsekwencja dla schematu: dokument strony (`packages/schema`) odwołuje się do sekcji/bloków przez
`component_key` (string), ale **schema nie trzyma globalnej allowlisty kluczy** — dostępne klucze to
te faktycznie zarejestrowane w rejestrze załadowanym w runtime danego repo (inne w `managed`, inne w
każdym „własnym repo").

## Narzędzia

- **pnpm workspaces** — bez Turborepo na start.
- **TypeScript strict mode** wszędzie.
- **Vitest** — testy jednostkowe we wszystkich pakietach.
- **React Testing Library** — testy komponentów.
- **Playwright** — end-to-end demo flow.
- **@dnd-kit/core** — drag & drop w canvasie.
- **`node:sqlite` (`DatabaseSync`)** — persystencja demo. Zmiana z pierwotnie planowanego
  `better-sqlite3` (2026-07-16): `better-sqlite3` wymaga kompilacji natywnej (node-gyp + MSVC),
  a środowisko deweloperskie nie ma zainstalowanych Visual Studio Build Tools. Wbudowany
  `node:sqlite` (dostępny bez flag od Node 22.5+/24, API niemal identyczne — `prepare/run/get/all`)
  daje te same gwarancje transakcyjne SQL bez zależności natywnej. Do rozważenia przy realnej
  integracji z serwerem produkcyjnym, jeśli tamten wymaga innego silnika.

## Co NIE wchodzi w zakres (obecny etap prac)

- Prawdziwa logika commerce (koszyk, checkout, płatności) — tylko demo.
- Faktyczny import pakietów do `sklepik`/`sklepikFront`/Store Factory/dashboardu React — to
  docelowy kierunek (patrz „Dystrybucja" wyżej), ale nie zakres bieżących etapów 1–4; robimy to
  jako osobny krok integracyjny, gdy `packages/persistence`+`renderer` będą gotowe.
- Model bezpieczeństwa/sandbox custom code — **rozstrzygnięty jako zbędny dla trybu własnego repo**
  (patrz „Dystrybucja"); jeśli tryb `managed` kiedyś dopuści częściowe dostosowania przez klienta,
  to osobna, późniejsza decyzja, nie blocker dla obecnych etapów.
