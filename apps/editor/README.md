# apps/editor

Next.js UI edytora. Etap 6 (canvas + drag&drop) zrobiony: `/` pokazuje demo stronę (seedowaną przez
`@editor/persistence` na `node:sqlite`), z listą sekcji do przeciągania (`@dnd-kit`) i przyciskami
Cofnij/Ponów spiętymi z `CommandStack` z `@editor/editor-core` przez hook `useEditorStore`.
Sekcje renderowane są przez `@editor/renderer` w trybie `edit`.

Komponenty sekcji w `src/lib/sections.tsx` to **placeholdery** — `packages/component-library`
(prawdziwe Hero/RichText/Newsletter/...) jeszcze nie istnieje.

Poza zakresem Etapu 6 (patrz `docs/INSTRUKCJA_INTEGRACJI.md`): edycja z powrotem do persistence
(draft/publish — Etap 9), panel właściwości (Etap 7), iframe/tryb `live` osobny od `edit` (Etap 8).

```bash
pnpm --filter @editor/app dev   # http://localhost:3100
```
