# Edytor Sklepu

Niezależny wizualny edytor stron i motywów dla ekosystemu `sklepik`, rozwijany jako monorepo **TypeScript / React / Next.js**.

> To repozytorium nie zawiera już Railsowego storefrontu ani gemu `spree_page_builder`. Katalogi `storefront/`, `page_builder/` i `lib/` zostały usunięte. Stary kod Spree był punktem odniesienia funkcjonalnego, ale dalszy rozwój odbywa się wyłącznie w TypeScript.

## Stan projektu

### Gotowe

- monorepo pnpm (`apps/*`, `packages/*`),
- wspólna konfiguracja TypeScript,
- `packages/schema` jako źródło prawdy dla stron, motywów, sekcji, bloków i wersji,
- schematy Zod oraz typy TypeScript,
- 16 kanonicznych typów sekcji,
- testy schematów,
- dokumentacja architektury, zgodności i planowanej integracji.

### Jeszcze niegotowe

- właściwa aplikacja wizualnego edytora w `apps/editor`,
- `packages/editor-core` z komendami i undo/redo,
- persistence i wersjonowanie draft/publish,
- renderer React współdzielony ze storefrontem,
- biblioteka komponentów,
- canvas drag & drop, panel właściwości i live preview,
- upload mediów, motywy oraz historia wersji,
- produkcyjna integracja z `pawelekbyra/sklepik` i `sklepikFront`.

Obecny kod jest więc **fundamentem rewrite'u**, a nie ukończonym page builderem.

## Docelowy podział

```text
edytor-sklepu/
├── apps/
│   └── editor/                # planowana aplikacja Next.js z canvasem i preview
├── packages/
│   ├── schema/                # istnieje: Zod schemas + typy TS
│   ├── editor-core/           # planowane: komendy, walidacja, undo/redo
│   ├── persistence/           # planowane: interfejsy repozytoriów + adapter demo/API
│   ├── renderer/              # planowane: renderPage/renderSection
│   └── component-library/     # planowane: komponenty React
└── docs/
```

Edytor ma operować na wersjonowanym dokumencie strony. Backend `sklepik` będzie przechowywał strony, motywy, media i opublikowane wersje, a `sklepikFront` będzie renderował opublikowany dokument przez ten sam renderer React, którego używa podgląd edytora.

## Dokumentacja

- [`docs/ARCHITEKTURA.md`](docs/ARCHITEKTURA.md) — docelowy podział pakietów i odpowiedzialności,
- [`docs/MACIERZ_ZGODNOSCI.md`](docs/MACIERZ_ZGODNOSCI.md) — rzeczywisty status funkcji,
- [`docs/INSTRUKCJA_INTEGRACJI.md`](docs/INSTRUKCJA_INTEGRACJI.md) — plan połączenia z `sklepik` i `sklepikFront`.

## Rozwój lokalny

Wymagania: Node.js 22+ i pnpm.

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

Na obecnym etapie testy i typecheck dotyczą głównie istniejących pakietów, przede wszystkim `packages/schema`. `apps/editor` pozostaje placeholderem do czasu wdrożenia rdzenia, persistence i renderera.

## Zasady projektu

1. TypeScript jest jedyną aktywną implementacją edytora.
2. `packages/schema` definiuje kontrakt dokumentu i nie zależy od Reacta ani bazy danych.
3. Edytor korzysta z interfejsów repozytoriów, a nie z konkretnego backendu.
4. Preview i storefront produkcyjny powinny używać tego samego renderera.
5. Logika commerce — produkty, koszyk, checkout, płatności i zamówienia — pozostaje w `sklepik`; edytor odpowiada za kompozycję i wygląd stron.

## Pochodzenie

Repozytorium powstało na bazie kodu storefrontu i page buildera Spree. Railsowa implementacja została usunięta po rozpoczęciu rewrite'u. Historia Git zachowuje ją jako materiał referencyjny, ale nie jest ona częścią aktualnego drzewa ani planu rozwoju.