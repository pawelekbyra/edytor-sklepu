# Edytor Sklepu

Niezależny wizualny edytor stron i motywów dla ekosystemu `sklepik`, rozwijany jako monorepo
**TypeScript / React / Next.js**.

> To repozytorium nie zawiera już Railsowego storefrontu ani gemu `spree_page_builder`. Katalogi
> `storefront/`, `page_builder/` i `lib/` zostały usunięte. Stary kod Spree był punktem odniesienia
> funkcjonalnego (patrz [`docs/EDITOR_ARCHITECTURE.md`](docs/EDITOR_ARCHITECTURE.md) — audyt
> oryginalnego page buildera), ale dalszy rozwój odbywa się wyłącznie w TypeScript.

## Stan projektu (etapy 1–7 z 12 zrobione)

Szczegółowy, wiersz-po-wierszu status każdej funkcji: [`docs/MACIERZ_ZGODNOSCI.md`](docs/MACIERZ_ZGODNOSCI.md).
Plan integracji z `pawelekbyra/sklepik`: [`docs/INSTRUKCJA_INTEGRACJI.md`](docs/INSTRUKCJA_INTEGRACJI.md).

### Gotowe

- `packages/schema` — schematy Zod (`Page`, `Theme`, `Section`, `Block`, `PageVersion`) i typy TS
- `packages/persistence` — `PageRepository`, `ThemeRepository`, `VersionRepository`,
  `MediaRepository`, `DemoCommerceProvider` na `node:sqlite`, z izolacją `storeId`
- `packages/renderer` — rejestr komponentów, `renderPage`/`renderSection`/`renderBlock`,
  `sectionStyles`/`blockStyles`, `SectionErrorBoundary`
- `packages/editor-core` — `Command`/`CommandStack` (undo/redo), `Move`/`UpdateSectionCommand`,
  `Move`/`UpdateBlockCommand`
- `apps/editor` — canvas z drag&drop (`@dnd-kit`) i panel właściwości generowany ze schematów Zod,
  zweryfikowane w przeglądarce

### Jeszcze niegotowe

- `packages/component-library` — prawdziwe komponenty sekcji (Hero, Header, ProductGrid, itd.);
  `apps/editor` na razie renderuje placeholdery
- live preview w trybie `live` osobnym od `edit` (Etap 8)
- draft/publish i historia wersji w UI (Etap 9) — `VersionRepository` już to obsługuje, brak spięcia z UI
- biblioteka mediów w UI (Etap 10) — `MediaRepository` gotowe
- zarządzanie motywami w UI (Etap 11)
- produkcyjna integracja z `pawelekbyra/sklepik` i `sklepikFront` — patrz „Decyzja o dystrybucji" niżej

## Decyzja o dystrybucji

Docelowo każdy nowy sklep tworzony w Store Factory (`sklepik`) ma mieć ten edytor, w obu trybach
niezależności: `managed` (współdzielony runtime) i „własne repo" (pełna niezależność kodu, bez
sandboxa na custom code). Szczegóły: [`docs/ARCHITEKTURA.md`](docs/ARCHITEKTURA.md) § „Dystrybucja".

## Rozwój lokalny

```bash
pnpm install
pnpm -r test         # wszystkie pakiety
pnpm -r typecheck
pnpm --filter @editor/app dev   # canvas demo: http://localhost:3100
```

## Struktura

Pełny opis architektury (docelowej i bieżącej): [`docs/ARCHITEKTURA.md`](docs/ARCHITEKTURA.md).

```text
edytor-sklepu/
├── docs/                    # architektura, macierz zgodności, plan integracji, audyt Spree
├── apps/
│   └── editor/              # Next.js — canvas, panel właściwości
└── packages/
    ├── schema/               # Zod schematy + typy TS
    ├── editor-core/          # komendy, undo/redo (bez Reacta)
    ├── persistence/          # interfejsy repozytoriów + implementacja SQLite demo
    ├── renderer/             # rejestr typ→komponent, renderPage/renderSection
    └── component-library/    # (planowane) komponenty React
```

## Licencja

Brak pliku `LICENSE` w tym repo (oryginalne `storefront/LICENSE.md` i `page_builder/LICENSE.md`
zostały usunięte razem z tymi katalogami) — do ustalenia przed publicznym udostępnieniem repo.
