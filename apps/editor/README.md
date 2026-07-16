# apps/editor

Next.js UI edytora. `/` pokazuje demo stronę (seedowaną przez `@editor/persistence` na
`node:sqlite`) z pełnym canvasem:

- **drag&drop** kolejności sekcji (`@dnd-kit`) → `MoveSectionCommand`
- **dodawanie/usuwanie** sekcji (paleta + 🗑) → `AddSectionCommand` / `DeleteSectionCommand`
- **panel właściwości** generowany ze schematów Zod → `UpdateSectionCommand`
- **Cofnij/Ponów** — `CommandStack` z `@editor/editor-core` przez hook `useEditorStore`
- **tryb Podgląd** — cała strona przez `renderPage(..., { mode: 'live' })`, bez chrome edytora

Sekcje **treści** pochodzą z `@editor/component-library` — te same komponenty rejestruje
`apps/storefront-demo`, dlatego podgląd odpowiada opublikowanej stronie. Sekcje **commerce**
(`product_grid`) edytor rejestruje lokalnie jako statyczny podgląd, bo nie ma warstwy danych
storefrontu (patrz `docs/ARCHITEKTURA.md`, „Podział sekcji: treść vs commerce").

Poza zakresem: zapis zmian z powrotem do persistence (draft/publish — Etap 9), media (Etap 10),
motywy (Etap 11), panel właściwości dla bloków.

```bash
pnpm --filter @editor/app dev   # http://localhost:3100
```
