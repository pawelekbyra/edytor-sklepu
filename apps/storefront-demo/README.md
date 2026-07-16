# apps/storefront-demo

**Integration spike** (patrz `docs/ARCHITEKTURA.md` → „Plan dalszy"): dowodzi, że dokument strony
wyprodukowany przez edytor renderuje się w samodzielnym storefroncie — bez dotykania produkcyjnego
`sklepik` i bez multi-tenancy.

Reprezentuje tryb **„własne repo"**: dokument strony to zwykły, wersjonowany gitem plik JSON
w tym repo (`content/demo-store/page_home.json`), czytany przez `FilePageRepository` — ten sam
interfejs `PageRepository`, którego edytor używa nad SQLite/API.

Renderuje przez `@editor/renderer` w trybie `live`:

- **sekcje treści** — z `@editor/component-library`, dokładnie te same komponenty co w edytorze
  (dlatego podgląd w edytorze == ta strona);
- **sekcje commerce** (`product_grid`) — **własna** implementacja tego storefrontu, spięta z jego
  warstwą danych (tu: `DemoCommerceProvider`). Ten sam `component_key`, inna implementacja per
  runtime — o to chodzi w podziale treść/commerce.

```bash
pnpm --filter @editor/storefront-demo dev   # http://localhost:3200
```

## Czego spike dowiódł / co ujawnił

- ✅ Round-trip działa: dokument JSON → `FilePageRepository` → `renderPage(live)` → strona.
- ✅ Sekcja commerce może być **async React Server Component** i sama pobrać dane — rejestr to
  wytrzymuje, ale wymaga rzutowania, bo `SectionComponent` to `ComponentType` (nie obejmuje
  komponentów async). Typy renderera warto poszerzyć.
- ✅ Podział edit/live realnie działa: ten sam komponent renderuje `<a href>` na żywo, a inertny
  `<span>` na canvasie.
- 🔧 Naprawione po drodze: `SectionErrorBoundary` musiał dostać `'use client'` — error boundary
  musi być klasą, a klasy nie działają w Server Components, więc bez tego **całego renderera nie
  dało się zaimportować do storefrontu**.
