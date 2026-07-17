# edytor-sklepu — silnik page buildera: zasady dla agentów

## Kontekst projektu (przeczytaj najpierw)

To repozytorium jest **silnikiem wizualnego edytora stron** dla ekosystemu Sklepik (fabryka niezależnych sklepów, backend `pawelekbyra/sklepik`, storefront `pawelekbyra/sklepikFront`). Powstało jako spike w izolacji (własne demo `apps/storefront-demo`) i udowodniło, że architektura działa — teraz jest w fazie integracji z prawdziwym storefrontem.

**Model docelowy całego ekosystemu (decyzja właściciela 2026-07-17) to jeden, współdzielony storefront wielosklepowy** (`sklepikFront` ewoluujący w miejscu), z tym silnikiem osadzonym jako chroniona trasa `/admin` tamtej aplikacji — nie osobne repo/deployment per sklep (ten kierunek, "Store Factory", został świadomie odrzucony po dziewięciu research-passach nad wzorcami multi-tenant SaaS). Kanon tej decyzji: `pawelekbyra/sklepik/docs/plans/storefront-composition-system.md` — **przeczytaj to przed jakąkolwiek pracą integracyjną**, bo ustala kontrakt między tym repo a `sklepikFront`/`sklepik`.

Obowiązkowa lektura przed pracą (w tym repo):

- [`docs/ROADMAPA.md`](docs/ROADMAPA.md) — co zostało do integracji, otwarte pytania, pułapki środowiskowe. Zacznij tu.
- [`docs/ARCHITEKTURA.md`](docs/ARCHITEKTURA.md) — architektura pakietów, decyzje projektowe i uzasadnienia.
- [`docs/MACIERZ_ZGODNOSCI.md`](docs/MACIERZ_ZGODNOSCI.md) — status funkcja-po-funkcji.
- `pawelekbyra/sklepik/docs/plans/storefront-composition-system.md` — kanon docelowej architektury całego ekosystemu (zewnętrzny, ale nadrzędny wobec decyzji w tym repo).

## Protokół dokumentacji (obowiązkowy)

Dokumentacja ma **zawsze odzwierciedlać rzeczywisty stan projektu**. Po każdym zakończonym zadaniu, w tym samym commicie:

1. Zaktualizuj [`docs/ROADMAPA.md`](docs/ROADMAPA.md) — popraw treść (co działa / co zostało), nie dopisuj dziennika zmian; historia jest w gicie.
2. Jeśli zmieniłeś architekturę pakietów albo podjąłeś decyzję projektową — zaktualizuj [`docs/ARCHITEKTURA.md`](docs/ARCHITEKTURA.md) z krótkim uzasadnieniem.
3. Jeśli zaimplementowałeś/zmieniłeś funkcję z macierzy — zaktualizuj jej status w [`docs/MACIERZ_ZGODNOSCI.md`](docs/MACIERZ_ZGODNOSCI.md).
4. Jeśli decyzja wpływa na integrację z `sklepik`/`sklepikFront` (kontrakt danych, sposób montowania `/admin`, format dokumentu strony) — zgłoś to jawnie w `ROADMAPA.md` i, jeśli to zmiana fundamentalna, zaproponuj aktualizację `sklepik/docs/plans/storefront-composition-system.md` (ten dokument jest nadrzędny, nie duplikuj jego treści tutaj).
5. Nie twórz nowych plików-notatek (handoffy, statusy). Aktualizuj istniejące dokumenty.
6. **Przed uznaniem zadania za zakończone: sprawdź kod, nie ufaj wcześniejszym opisom.** Ten projekt już raz zebrał trzy niezależne przypadki driftu dokumentacji od kodu w jednej sesji (nieaktualny opis architektury, złe liczby testów, martwe README) — zanim napiszesz "X działa", zweryfikuj uruchomieniem testów albo przeglądarką.

Zasady twarde: nie commituj sekretów (`.env` musi być w `.gitignore` — to już raz omal nie wyciekło); commity małe i logiczne, po polsku lub angielsku, bez detali implementacyjnych w body.

---

## Struktura monorepo

pnpm workspace (bez Turborepo — świadoma decyzja, patrz `ARCHITEKTURA.md`).

| Katalog | Rola |
|---|---|
| `packages/schema` | Zod: `Page`, `Section`, `Block`, `Theme` — źródło typów dla całego silnika |
| `packages/editor-core` | Komendy edytora, undo/redo (command pattern) |
| `packages/persistence` | `PageRepository` i implementacje: `SQLitePageRepository`, `FilePageRepository`, `GitHubPageRepository` (ta ostatnia — legacy, budowana pod odrzucony model repo-per-sklep, patrz niżej) |
| `packages/renderer` | Renderer drzewa sekcji, tryb `edit`/`live` |
| `packages/component-library` | Biblioteka komponentów sekcji treści (7/14 zaimplementowanych), współdzielona między edytorem a storefrontem |
| `apps/editor` | Next.js — canvas edytora, panel właściwości generowany z Zod |
| `apps/storefront-demo` | Dowód round-tripu (JSON → renderer → strona) — demo w izolacji, docelowo zastępowane integracją z prawdziwym `sklepikFront` |

Nazwy pakietów: **`@pawelekbyra/*`** (zweryfikowane 2026-07-17 — `@sklepik/*` nie działa jako scope GitHub Packages, bo repo należy do konta osobistego `pawelekbyra`, nie do organizacji `sklepik`). **Opublikowane** jako wersjonowane paczki na GitHub Packages (`npm.pkg.github.com`) — `@pawelekbyra/{schema,editor-core,persistence,renderer,component-library}@0.0.1` są tam już live od 2026-07-17. Infrastruktura: `publishConfig` w każdym `package.json` biblioteki, Changesets (`.changeset/`), `.github/workflows/release.yml`. **Uwaga o mechanice:** pierwsza publikacja poszła automatycznie na pierwszym pushu (Changesets bez wcześniejszych tagów uznaje wersję za niepublikowaną i publikuje od razu) — dopiero **kolejne** wersje przechodzą przez bramkę PR-a (changeset → „Version Packages" PR → merge → realna publikacja). Nie zakładaj automatycznie „nic się nie opublikuje" przy kolejnych zmianach w `package.json`/wersji — sprawdź `gh run list` po pushu.

## Ważne: co jest legacy

`packages/persistence`'s `GitHubPageRepository` (git-based CMS, commit-per-publikacja) był budowany pod odrzucony model "repo per sklep". W modelu docelowym dokumenty stron żyją w bazie `sklepik`, scoped po `store_id` (nowa implementacja `PageRepository`, robocza nazwa `SklepikPageRepository`, po stronie `sklepik`). `GitHubPageRepository` zostaje w kodzie jako działająca, przetestowana opcja/materiał referencyjny — nie rozwijać dalej jako główną ścieżkę integracji.

## Development

```bash
pnpm install
pnpm --filter @editor/app dev       # canvas edytora, localhost:3100
pnpm --filter @editor/storefront-demo dev  # demo storefrontu, localhost:3200
pnpm test        # wszystkie pakiety (Vitest)
pnpm typecheck    # wszystkie pakiety
```

Zawsze uruchamiaj testy i typecheck przed commitem. Dla zmian widocznych w przeglądarce (canvas, tryb podglądu) — zweryfikuj w przeglądarce, nie tylko testami; ten projekt ma historię błędów, które testy jednostkowe przepuściły (np. rozjazd renderowania edytor/storefront wykryty tylko przez ręczną weryfikację w przeglądarce).

## Konwencje kodu

- Zero komentarzy poza nietrywialnymi przypadkami (ukryte ograniczenie, obejście konkretnego buga) — nazwy identyfikatorów mają mówić co, nie komentarz.
- Schema Zod (`packages/schema`) jest źródłem prawdy dla kształtu danych — nie duplikuj typów ręcznie w innych pakietach.
- Komponenty w `component-library` **nie mogą mieć `'use client'` ani handlerów zdarzeń** — muszą działać zarówno jako Server Components (storefront), jak i wewnątrz drzewa klienta (canvas edytora). Wyjątek: klasy (np. error boundary) wymagają `'use client'` jawnie — to już raz zablokowało import całego renderera do Server Component, sprawdzaj to przy każdej nowej klasie w tym pakiecie.
- Sekcje commerce (`product_grid`, `category_grid`) to sloty rejestru wypełniane danymi przez hosta (storefront), nie przez samą bibliotekę — biblioteka nie zna Store API `sklepik`.
