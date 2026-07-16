# Edytor Sklepu

Niezależny wizualny edytor stron i motywów dla ekosystemu `sklepik`, rozwijany jako monorepo
**TypeScript / React / Next.js**.

> To repozytorium nie zawiera już Railsowego storefrontu ani gemu `spree_page_builder`. Katalogi
> `storefront/`, `page_builder/` i `lib/` zostały usunięte. Stary kod Spree był punktem odniesienia
> funkcjonalnego (patrz [`docs/EDITOR_ARCHITECTURE.md`](docs/EDITOR_ARCHITECTURE.md) — audyt
> oryginalnego page buildera), ale dalszy rozwój odbywa się wyłącznie w TypeScript.

## Stan projektu (etapy 1–8 z 12 + tryb „własne repo")

**Zaczynasz tu pracę (człowiek albo agent)? Czytaj [`docs/ROADMAPA.md`](docs/ROADMAPA.md)** — co
zostało do wdrożenia, podjęte decyzje, pułapki środowiskowe i otwarte pytania.

Szczegółowy, wiersz-po-wierszu status każdej funkcji: [`docs/MACIERZ_ZGODNOSCI.md`](docs/MACIERZ_ZGODNOSCI.md).
Plan integracji z `pawelekbyra/sklepik`: [`docs/INSTRUKCJA_INTEGRACJI.md`](docs/INSTRUKCJA_INTEGRACJI.md).

> ⚠️ To jest **zweryfikowany prototyp, nie system produkcyjny**. Edytor nie jest podłączony do
> `sklepik`/`sklepikFront` i **nie ma żadnej autoryzacji** — patrz `ROADMAPA.md` §3.

### Gotowe

- `packages/schema` — schematy Zod (`Page`, `Theme`, `Section`, `Block`, `PageVersion`) i typy TS
- `packages/persistence` — `PageRepository`, `ThemeRepository`, `VersionRepository`,
  `MediaRepository`, `DemoCommerceProvider` na `node:sqlite`, z izolacją `storeId`
- `packages/renderer` — rejestr komponentów, `renderPage`/`renderSection`/`renderBlock`,
  `sectionStyles`/`blockStyles`, `SectionErrorBoundary`
- `packages/editor-core` — `Command`/`CommandStack` (undo/redo), `Move`/`Update`/`Add`/`Delete`
  SectionCommand, `Move`/`UpdateBlockCommand`
- `packages/component-library` — 7 z 14 sekcji treści + `registerContentSections()`; te same
  komponenty rejestruje edytor i storefront
- `apps/editor` — canvas z drag&drop (`@dnd-kit`), dodawanie/usuwanie sekcji, panel właściwości
  generowany ze schematów Zod, tryb Podgląd (`live`), **zapis dokumentu**
- `apps/storefront-demo` — storefront trybu „własne repo": renderuje dokument JSON ze swojego repo
  przez ten sam renderer. Round-trip edycja→zapis→storefront zweryfikowany w przeglądarce.

### Jeszcze niegotowe

- reszta `component-library` (Header, Footer, Testimonials, Video, Columns, Image, Navigation)
- draft/publish i historia w UI (Etap 9) — `VersionRepository` gotowy, brak spięcia z UI
- biblioteka mediów w UI (Etap 10) — `MediaRepository` gotowe
- zarządzanie motywami w UI (Etap 11)
- pola-tablice w panelu właściwości (`faq.items`, `testimonials.items`)
- **pierwsze realne uruchomienie `GitHubPageRepository`** przeciw prawdziwemu repo sklepu

## Decyzja o dystrybucji i o tym, gdzie żyje treść

Każdy nowy sklep ze Store Factory ma docelowo mieć ten edytor. **Decyzja właściciela (2026-07-16):
tryb „własne repo"** — dokumenty stron to JSON w repo sklepu, publikacja = commit + redeploy
(`GitHubPageRepository`). Oddanie repo klientowi oddaje więc również jego treść, zgodnie z
Definition of Done Store Factory.

Uwaga na częste nieporozumienie: **backend commerce (`sklepik`) jest zawsze** — trzyma produkty,
ceny, koszyk i zamówienia w każdym trybie. Powyższa decyzja dotyczy wyłącznie *dokumentów stron*.

Szczegóły: [`docs/ARCHITEKTURA.md`](docs/ARCHITEKTURA.md) → „Dystrybucja", „Kto jest źródłem prawdy",
„Integracja z ekosystemem sklepik".

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
├── docs/                    # ROADMAPA (zacznij tu), architektura, macierz zgodności, audyt Spree
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
