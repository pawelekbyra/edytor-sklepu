# `apps/editor`

Docelowa aplikacja Next.js dla wizualnego edytora stron.

## Stan obecny

Ten katalog jest obecnie placeholderem. Interfejs edytora nie został jeszcze zaimplementowany.

Przed rozpoczęciem canvasa i panelu właściwości potrzebne są:

1. `packages/editor-core` — komendy, walidacja i undo/redo,
2. `packages/persistence` — strony, motywy, wersje i media,
3. `packages/renderer` — wspólne renderowanie dokumentu strony,
4. `packages/component-library` — komponenty React używane w preview i storefroncie.

Następnie aplikacja ma dostarczyć:

- canvas z drag & drop,
- panel właściwości generowany ze schematów,
- live preview w iframe,
- draft/publish i historię wersji,
- bibliotekę mediów oraz zarządzanie motywami.

Pełny plan znajduje się w [`docs/ARCHITEKTURA.md`](../../docs/ARCHITEKTURA.md), a aktualny status funkcji w [`docs/MACIERZ_ZGODNOSCI.md`](../../docs/MACIERZ_ZGODNOSCI.md).
