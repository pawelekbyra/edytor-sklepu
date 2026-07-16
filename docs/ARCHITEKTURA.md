# Architektura nowego edytora (TypeScript / React / Next.js)

> Dokument opisuje architekturę samodzielnego edytora stron w TypeScript **oraz plan jego
> integracji** z ekosystemem `sklepik`/`sklepikFront`. Status funkcji wiersz-po-wierszu:
> [`docs/MACIERZ_ZGODNOSCI.md`](MACIERZ_ZGODNOSCI.md). Krok-po-kroku plan pracy nad pakietami:
> [`docs/INSTRUKCJA_INTEGRACJI.md`](INSTRUKCJA_INTEGRACJI.md) (jego §1–4 o integracji są zastąpione
> sekcją „Integracja z ekosystemem sklepik" w tym dokumencie).

## Cel

Samodzielna aplikacja edytora stron/motywów/sekcji/bloków w TypeScript, uruchamialna niezależnie,
z rdzeniem domenowym (`schema`, `editor-core`, `renderer`) odseparowanym od frameworka UI i od
konkretnej bazy danych — tak, żeby logika edytora nie wymagała przepisywania przy zmianie backendu.
Po stronie **edytora** integracja z `sklepik` to faktycznie tylko podmiana implementacji
repozytorium (Front B niżej); pełna integracja obejmuje jednak jeszcze backend i storefront —
patrz „Integracja z ekosystemem sklepik".

**Decyzja właściciela (2026-07-16):** docelowo każdy nowy sklep tworzony w Store Factory ma mieć
ten edytor — zarówno w trybie `managed` (współdzielony runtime), jak i w trybie „własne repo"
(pełna niezależność kodu). Zobacz sekcję „Dystrybucja" niżej.

**Stan prac (2026-07-16): Etapy 1–7 zrobione.** Gotowe i przetestowane: `packages/schema`,
`packages/persistence` (repozytoria + demo na `node:sqlite`), `packages/renderer` (rejestr +
`renderPage/renderSection`), `packages/editor-core` (komendy, undo/redo), `apps/editor` (canvas
z drag&drop + panel właściwości, zweryfikowane w przeglądarce). Repo nadal rozwija się w izolacji —
bez importu do `sklepik`/`sklepikFront` — ale interfejsy (`packages/persistence`,
`registerSection`/`registerBlock`) są projektowane pod kątem docelowej dystrybucji. Szczegółowy
status wiersz-po-wierszu: [`MACIERZ_ZGODNOSCI.md`](MACIERZ_ZGODNOSCI.md).

**Rewizja rozumienia integracji (2026-07-16).** Pierwotny plan (`INSTRUKCJA_INTEGRACJI.md`) opisywał
integrację jako „podmień `PageRepository` na klienta API". Po weryfikacji stanu `sklepik`/`sklepikFront`
to okazało się **niedoszacowane**: `sklepik` nie ma dziś żadnego modelu stron/motywów/sekcji (to
zasób do zbudowania od zera), a `sklepikFront` renderuje storefront ręcznie kodowanymi trasami
Next.js, nie rendererem czytającym dokument. Integracja to więc **trzy fronty, nie jeden** — patrz
nowa sekcja „Integracja z ekosystemem sklepik" niżej, która zastępuje uproszczony obraz z
`INSTRUKCJA_INTEGRACJI.md` §1–4.

## Struktura monorepo

```
edytor-sklepu/
├── docs/
│   ├── ARCHITEKTURA.md                  # ten plik — architektura + plan integracji
│   ├── MACIERZ_ZGODNOSCI.md             # status funkcji wiersz-po-wierszu
│   ├── INSTRUKCJA_INTEGRACJI.md         # krok-po-kroku plan pracy nad pakietami
│   └── EDITOR_ARCHITECTURE.md           # audyt oryginalnego spree_page_builder (baseline)
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
- Implementacja demo: `node:sqlite` (`DatabaseSync`), w pamięci / plik `.data/editor.db`.
- `CommerceProvider` zwraca dane demo (nie przepisujemy commerce).
- **Warstwa wymienna zależnie od trybu dystrybucji** — nie jedna implementacja „do podmiany", ale
  rodzina implementacji tego samego interfejsu (patrz „Kto jest źródłem prawdy" niżej):
  implementacja SQLite pozostaje jako tryb offline/standalone/testowy, `SklepikApiPageRepository`
  (managed) i `FilePageRepository` (własne repo) dochodzą obok niej.

### `packages/renderer`
- Rejestr `registerSection(type, Component)` / `registerBlock(type, Component)`.
- `renderPage(page, { mode })` i `renderSection(section, { mode })`.
- Funkcje `sectionStyles()`/`blockStyles()` (preferencje → CSS).
- Współdzielony między edytorem a przyszłym storefrontem Next.js.

### `packages/component-library` (nierozpoczęte)
- **Sekcje treści** (bezstanowe, bez danych z zewnątrz) — mieszkają tutaj i są współdzielone:
  `Hero`, `Header`, `Footer`, `ImageBanner`, `RichText`, `Newsletter`, `Testimonials`, `FAQ`,
  `Video`, `Spacer`, `Columns`, `Button`, `Image`, `Navigation`.
- **Sekcje commerce** (`ProductGrid`, `CategoryGrid`) — NIE mieszkają tutaj jako gotowe komponenty,
  bo wymagają warstwy danych (Store API). Są slotem rejestru: host (storefront) rejestruje własną
  implementację spiętą ze swoim data layerem, a edytor rejestruje statyczny placeholder do podglądu
  na canvasie. Szczegóły: „Podział sekcji: treść vs commerce" niżej. To unika duplikowania
  renderowania produktów, które `sklepikFront` już ma.
- Czysto prezentacyjne, zero logiki biznesowej (dotyczy sekcji treści).

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

## Integracja z ekosystemem sklepik — trzy fronty, nie jeden

Weryfikacja stanu `sklepik`/`sklepikFront` (2026-07-16) pokazała, że pełna integracja to trzy
niezależne fronty pracy. Stary opis w `INSTRUKCJA_INTEGRACJI.md` §1–4 opisuje tylko Front B i przez
to zaniża skalę.

### Front A — backend `sklepik` (zasób stron/motywów, od zera)
`sklepik` **nie ma dziś żadnego modelu** stron/motywów/sekcji/wersji (potwierdzone: brak
`Spree::Page`/`Spree::Theme`, brak migracji). Front A to nowa praca w produkcyjnym repo Rails:
- migracje Postgres (strony, motywy, wersje, media) — jeden `jsonb` z drzewem dokumentu na wersję,
  zgodny kształtem z `packages/schema`, zamiast normalizować sekcje/bloki na osobne tabele;
- modele + serializacja do dokładnego kształtu JSON, który waliduje `packages/schema` (to jest
  kontrakt — po obu stronach ta sama Zod-owa prawda o kształcie);
- endpointy Admin API v3 (lista w `INSTRUKCJA_INTEGRACJI.md` §3 jest dobrym szkicem);
- autoryzacja per `storeId` (CanCanCan), spójna z resztą Admin API.
- **Uwaga:** dotyka repo z realnym ruchem produkcyjnym — nie piaskownica.

### Front B — edytor `edytor-sklepu` (klient API)
Najmniejszy front, o ile kształty schematu się zgadzają: `SklepikApiPageRepository implements
PageRepository` jako klient HTTP zamiast SQLite. To dokładnie ta wymienność, pod którą projektowano
`packages/persistence`. Implementacja SQLite **nie znika** — zostaje jako tryb offline/standalone/test.

### Front C — storefront `sklepikFront` (adopcja renderera) — najbardziej niedoszacowany
Dziś `sklepikFront` renderuje storefront **ręcznie kodowanymi trasami Next.js**
(`(storefront)/page.tsx` to komponent React, nie renderer czytający dokument). Żeby edytor cokolwiek
realnie kontrolował po stronie klienta, `sklepikFront` musi zaadoptować `@editor/renderer` +
`@editor/component-library` i renderować opublikowane dokumenty stron. **Bez Frontu C edytor edytuje
dokumenty, których nic nie wyświetla** — reszta jest dekoracyjna. To jest właściwy powód, dla którego
`packages/renderer` był projektowany jako współdzielony między edytorem a storefrontem: podgląd w
edytorze i opublikowana strona muszą używać tego samego kodu, inaczej „co widzisz to nie to co
dostajesz".

## Kto jest źródłem prawdy dla dokumentów stron — rozwidlenie per tryb

To rozwidlenie mapuje się 1:1 na dwa tryby dystrybucji i jest właśnie tym, co uzasadnia
interfejsową abstrakcję `packages/persistence`:

| Tryb | Źródło prawdy dokumentów | Implementacja `PageRepository` | Front C renderuje z |
|---|---|---|---|
| `managed` | Postgres w `sklepik` (Front A), jeden współdzielony storefront rozpoznający sklep po `Host` | `SklepikApiPageRepository` (HTTP) | Admin/Store API |
| „własne repo" | pliki JSON w repo storefrontu, wersjonowane gitem, deployowane z witryną | `FilePageRepository` (odczyt z repo) | własnego repo |

Wniosek strategiczny: **tryb „własne repo" jest tańszy do udowodnienia najpierw**, bo nie wymaga ani
Frontu A (backendu), ani multi-tenancy storefrontu — to po prostu „ten jeden storefront renderuje
dokumenty ze swojego repo". `sklepikFront` jest de facto szablonem storefrontu dla trybu „własne
repo". Dlatego pierwsza integracja powinna iść tą ścieżką (patrz „Plan dalszy").

## Podział sekcji: treść vs commerce

Krytyczne rozstrzygnięcie, bez którego `component-library` kolidowałby z istniejącym renderowaniem
produktów w `sklepikFront`:

- **Sekcje treści** (Hero, RichText, Newsletter, ImageBanner, FAQ, itd.) — bezstanowe, bez danych
  z zewnątrz. Mieszkają w `packages/component-library`, współdzielone identycznie przez edytor
  (tryb `edit`) i storefront (tryb `live`).
- **Sekcje commerce** (ProductGrid, CategoryGrid) — potrzebują warstwy danych (Store API), która
  należy do storefrontu, nie do biblioteki. Nie są gotowym komponentem w `component-library`; są
  **slotem rejestru**:
  - storefront (`sklepikFront`) rejestruje własną implementację `product_grid`/`category_grid`
    spiętą ze swoim data layerem (i tak już ma komponenty kart produktów);
  - edytor rejestruje statyczny placeholder, żeby canvas nie był pusty.
  - Mechanizm już istnieje — to zwykły `registerSection('product_grid', ...)`, rejestr jest
    per-runtime, więc każde środowisko wstawia właściwą wersję. Żadnej nowej machinerii.

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

## Plan dalszy (zrewidowany 2026-07-16)

Rewizja wynika z ustalenia, że integracja to trzy fronty (wyżej). Największe ryzyko architektoniczne
nie leży w dopieszczaniu UI edytora (Etapy 9–12), tylko w **szwie edytor→dokument→storefront** i w
pytaniu o własność danych. Dlatego rekomendacja: zdejmij to ryzyko wcześnie, cienkim pionowym
przekrojem, zanim zainwestujesz w kolejne izolowane etapy.

Rekomendowana kolejność:

1. **Etap 8 — Live preview** (tanio, i tak potrzebne). Tryb `live` vs `edit` w rendererze bezpośrednio
   ćwiczy renderer w trybie, w którym użyje go storefront — dobra rozgrzewka przed Frontem C.
2. **Integration spike (NOWY, przed 9–12) — najtańsza walidacja całości.** Jeden pionowy przekrój:
   - jeden typ strony (homepage), **tylko sekcje treści** (Hero/RichText/Newsletter — bez commerce),
   - dokument trzymany jako JSON przez `FilePageRepository` (tryb „własne repo"),
   - minimalna trasa Next.js w osobnym storefroncie demo renderująca przez `@editor/renderer`.
   - Dowodzi round-tripu edytor → dokument → storefront **bez dotykania produkcyjnego `sklepik`** i
     bez multi-tenancy. Jeśli tu coś w architekturze nie gra, dowiadujesz się to najmniejszym kosztem.
3. **Decyzja managed vs „własne repo" jako ścieżka pierwsza** — na podstawie tego, co pokaże spike.
   „Własne repo" jest tańsze (bez Frontu A i bez multi-tenancy), więc domyślnie to ono.
4. **Etapy 9–12** (draft/publish w UI, media, motywy, pełna zgodność) — po/równolegle, teraz
   ugruntowane realnym szwem, nie budowane „na wiarę".
5. **Front A (backend `sklepik`)** — dopiero jeśli/gdy wybrany jest tryb `managed`. Duży, dotyka
   produkcji; nie zaczynać, dopóki spike nie potwierdzi kształtu kontraktu i nie ma decyzji o managed.

Kolejność Etapów 9–12 vs spike nie jest sztywna — spike można wpleść równolegle do 9–12, bo dotyka
innych plików (nowy `FilePageRepository` + demo storefront), nie koliduje z pracą w `apps/editor`.

## Co NIE wchodzi w zakres (nadal)

- Prawdziwa logika commerce (koszyk, checkout, płatności) — tylko demo/placeholdery.
- `packages/component-library` z prawdziwymi komponentami — nierozpoczęte; `apps/editor` renderuje
  na razie placeholdery.
- Faktyczny import do produkcyjnego `sklepik`/`sklepikFront` — świadomie po spike'u i po decyzji o
  trybie (patrz „Plan dalszy"), nie wcześniej.
- Model bezpieczeństwa/sandbox custom code — **rozstrzygnięty jako zbędny dla trybu własnego repo**
  (patrz „Dystrybucja"); dla trybu `managed` to osobna, późniejsza decyzja, nie blocker teraz.
