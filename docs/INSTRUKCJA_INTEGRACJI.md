# Instrukcja integracji edytora z `pawelekbyra/sklepik`

> Dokument opisuje jak dokończyć rozwój tego edytora (`pawelekbyra/edytor-sklepu`) i podłączyć go
> do głównego repo `pawelekbyra/sklepik`.

## Status obecny (main branch)

- ✅ Etapy 1–3: TypeScript monorepo scaffold, `packages/schema` z testami (13 ✓), dokumentacja PL
- ⏳ Etapy 4–12: Do zrobienia
- ❌ Spree Rails usunięty — to jest czysty TypeScript edytor

## Etapy do dokończenia

### Etap 4: Persistence i wersjonowanie
**Pakiet:** `packages/persistence`

**Interfejsy** (`src/repositories/`):
```ts
export interface PageRepository {
  create(storeId: string, page: Page): Promise<Page>;
  read(storeId: string, pageId: string): Promise<Page | null>;
  update(storeId: string, pageId: string, updates: Partial<Page>): Promise<Page>;
  delete(storeId: string, pageId: string): Promise<void>;
  listByStore(storeId: string): Promise<Page[]>;
}

export interface VersionRepository {
  saveDraft(storeId: string, pageId: string, document: PageDocument): Promise<PageVersion>;
  publish(storeId: string, pageId: string): Promise<PageVersion>; // transakcja
  getVersion(storeId: string, versionId: string): Promise<PageVersion>;
  listVersions(storeId: string, pageId: string): Promise<PageVersion[]>;
}

export interface ThemeRepository {
  create(storeId: string, theme: Theme): Promise<Theme>;
  read(storeId: string, themeId: string): Promise<Theme | null>;
  update(storeId: string, themeId: string, updates: Partial<Theme>): Promise<Theme>;
  delete(storeId: string, themeId: string): Promise<void>;
  listByStore(storeId: string): Promise<Theme[]>;
  setDefault(storeId: string, themeId: string): Promise<void>;
}

export interface MediaRepository {
  upload(storeId: string, file: File): Promise<{ id: string; url: string }>;
  delete(storeId: string, mediaId: string): Promise<void>;
  listByStore(storeId: string): Promise<Media[]>;
}

export interface CommerceProvider {
  getProducts(storeId: string): Promise<Product[]>;
  getCategories(storeId: string): Promise<Category[]>;
  getUser(storeId: string, userId: string): Promise<User | null>;
}
```

**Implementacja demo:** `better-sqlite3`, `.data/editor.db`

**Testy:** Vitest integracyjne (CRUD, transakcje, izolacja)

### Etap 5: Renderer komponentów
**Pakiet:** `packages/renderer`

- Rejestr `registerSection(type, Component)`
- `renderPage(page, { mode, storeId })`
- `renderSection(section, { mode })`
- Style helpers: `sectionStyles()`, `blockStyles()`

### Etap 6: Canvas i drag&drop
**Pakiet:** `apps/editor`

- `@dnd-kit/core` do sekcji/bloków
- `MoveSectionCommand`, `MoveBlockCommand` z undo/redo
- Preview live w iframe

### Etap 7: Panel właściwości
**Pakiet:** `apps/editor`

- Generowanie formularzy ze schematów Zod (`packages/schema`)
- `UpdateSectionCommand`, `UpdateBlockCommand`

### Etap 8: Live preview
**Pakiet:** `apps/editor`

- Renderowanie przez `packages/renderer`
- Tryb edycji (overlay "kliknij by edytować")

### Etap 9: Draft/publish i historia
**Pakiet:** `apps/editor`

- Przycisk "Publikuj" → `PublishPageCommand`
- Panel historii → `VersionRepository.listVersions()`

### Etap 10: Media
**Pakiet:** `apps/editor`

- Upload → `MediaRepository.upload()`
- Wybór → modal z listą

### Etap 11: Motywy
**Pakiet:** `apps/editor`

- Zarządzanie wieloma motywami
- Sekcje layoutu (header/footer) na poziomie motywu
- Publikacja motywu

### Etap 12: Pełna zgodność funkcjonalna
- Przegląd `docs/MACIERZ_ZGODNOSCI.md`
- Wszystkie wiersze powinny mieć status `przetestowane`
- E2E testy przez Playwright

---

## Integracja z `pawelekbyra/sklepik`

### 1. Interfejs kompatybilny

Gdy `packages/persistence` będzie gotowe, interfejsy pozostają te same:
```ts
export interface PageRepository { /* ... */ }
```

W `sklepik` implementujesz tę samą strukturę jako klient API zamiast SQLite:
```ts
// packages/persistence/src/sklepik/SklepikPageRepository.ts
import { PageRepository } from '../repositories/PageRepository';

export class SklepikPageRepository implements PageRepository {
  constructor(private apiClient: SklepikAPI) {}
  
  async create(storeId: string, page: Page): Promise<Page> {
    return this.apiClient.post(`/stores/${storeId}/pages`, page);
  }
  // ... itd
}
```

### 2. Warstwa abstrakcji

W `apps/editor` odwołujesz się **tylko** do interfejsów:
```ts
import type { PageRepository, VersionRepository } from '@editor/persistence';

export class EditorStore {
  constructor(
    private pages: PageRepository,
    private versions: VersionRepository
  ) {}
}
```

Implementację (SQLite vs. API) podajesz przy inicjalizacji:
```ts
// W demo: SQLite
const store = new EditorStore(
  new SQLitePageRepository(),
  new SQLiteVersionRepository()
);

// W sklepik: API
const store = new EditorStore(
  new SklepikPageRepository(apiClient),
  new SklepikVersionRepository(apiClient)
);
```

### 3. API contract dla `sklepik`

Edytor wymagam tych endpointów:

```
POST   /stores/{storeId}/pages
GET    /stores/{storeId}/pages
GET    /stores/{storeId}/pages/{pageId}
PUT    /stores/{storeId}/pages/{pageId}
DELETE /stores/{storeId}/pages/{pageId}

POST   /stores/{storeId}/pages/{pageId}/versions
GET    /stores/{storeId}/pages/{pageId}/versions
GET    /stores/{storeId}/versions/{versionId}

POST   /stores/{storeId}/themes
GET    /stores/{storeId}/themes
GET    /stores/{storeId}/themes/{themeId}
PUT    /stores/{storeId}/themes/{themeId}
DELETE /stores/{storeId}/themes/{themeId}
PUT    /stores/{storeId}/themes/{themeId}/set-default

POST   /stores/{storeId}/media (multipart)
DELETE /stores/{storeId}/media/{mediaId}
GET    /stores/{storeId}/media

GET    /stores/{storeId}/products
GET    /stores/{storeId}/categories
GET    /stores/{storeId}/users/{userId}
```

### 4. Repozytorium `sklepik`

W `pawelekbyra/sklepik`:
```
src/
├── api/
│   ├── pages/
│   ├── themes/
│   ├── versions/
│   └── media/
└── persistence/
    └── sklepik/
        ├── SklepikPageRepository.ts
        ├── SklepikThemeRepository.ts
        ├── SklepikVersionRepository.ts
        ├── SklepikMediaRepository.ts
        └── SklepikCommerceProvider.ts
```

### 5. Instalacja edytora jako npm zależność

W `sklepik` `package.json`:
```json
{
  "dependencies": {
    "@editor/schema": "workspace:*",
    "@editor/editor-core": "workspace:*",
    "@editor/persistence": "workspace:*",
    "@editor/renderer": "workspace:*",
    "@editor/component-library": "workspace:*"
  }
}
```

Albo (jeśli osobne repo):
```json
{
  "dependencies": {
    "@editor/persistence": "github:pawelekbyra/edytor-sklepu#main"
  }
}
```

### 6. Next.js storefront

Gdy będziesz budować Next.js storefront do `sklepik`:
```ts
import { renderPage } from '@editor/renderer';

export default async function Page({ params }: { params: { slug: string } }) {
  const page = await pageRepository.read(storeId, params.slug);
  const version = await versionRepository.getVersion(storeId, page.publishedVersionId);
  
  return renderPage(version.document, { mode: 'live', storeId });
}
```

---

## Checklistę do etapu 13 (gdy będzie pełna zgodność)

- [ ] Etap 4: `packages/persistence` + testy ✓
- [ ] Etap 5: `packages/renderer` + testy ✓
- [ ] Etap 6: Canvas w `apps/editor` + testy ✓
- [ ] Etap 7: Panel właściwości + testy ✓
- [ ] Etap 8: Live preview + testy ✓
- [ ] Etap 9: Draft/publish + historia + testy ✓
- [ ] Etap 10: Media upload + testy ✓
- [ ] Etap 11: Motywy + testy ✓
- [ ] Etap 12: Wszystkie wiersze `MACIERZ_ZGODNOSCI.md` = `przetestowane`
- [ ] E2E Playwright: pełny flow sklep → motyw → strona → draft → publish → reopen ✓
- [ ] Interfejsy `packages/persistence` wdrożone w `sklepik` ✓
- [ ] API endpointy w `sklepik` działające ✓

Gdy wszystko gotowe → edytor jest gotów do integracji do `sklepik`.

---

## Pytania?

- **Czy interfejsy persistence są wystarczające?** → Sprawdzić `MACIERZ_ZGODNOSCI.md` sekcja 1
- **Gdzie jest live preview?** → `packages/renderer` + `apps/editor` (etapy 5-8)
- **Co z undo/redo?** → `packages/editor-core` `CommandStack` (już zrobione w etapie 3)
