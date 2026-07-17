import { type Page, PageSchema } from '@editor/schema';
import { NotFoundError } from '../errors.js';
import type { PageRepository } from '../repositories/PageRepository.js';

export interface SklepikPageRepositoryOptions {
  /** Base URL of the sklepik Admin API, e.g. "https://141-253-103-172.nip.io/api/v3/admin". */
  baseUrl: string;
  /** Bearer JWT for an authenticated admin user — CanCanCan authorizes per store from this. */
  authToken: string;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
}

interface AdminStorefrontPageResponse {
  id: string;
  slug: string;
  title: string;
  draft_document: { schemaVersion: number; sections: unknown[] };
  published_document: { schemaVersion: number; sections: unknown[] } | null;
  published_at: string | null;
  published_by_id: string | null;
  lock_version: number;
}

// Rails today models storefront content as a single, store-owned homepage document, not a
// generic multi-page CMS — see `sklepik/spree/api/config/routes.rb` (`resource :storefront_page`,
// singular, resolved from `X-Spree-Store-Id`, no `:id` param). PAGE_ID is the document's `slug`,
// which is the one stable, predictable identifier this API exposes — every method validates a
// caller's pageId against it so asking for a different page fails loudly instead of silently
// touching the wrong content. Generalizing to real multi-page CRUD is tracked as an open question
// in `sklepik/docs/plans/storefront-composition-system.md`, not solved here.
const PAGE_ID = 'home';
// Placeholder until `Spree::StoreTheme`/design tokens exist (storefront-composition-system.md
// Design Details, Etap 1 personalizacji) — every page belongs to this theme until themes are real.
const DEFAULT_THEME_ID = 'default';

// "Współdzielony storefront" mode (storefront-composition-system.md, kanon decyzji 2026-07-17):
// page documents live in the `sklepik` database, scoped by store_id, not in a git repo per shop
// (that was `GitHubPageRepository`, now legacy). Deliberately the same `PageRepository` interface
// as the SQLite/File/GitHub implementations — the editor does not know or care that this one talks
// to a Rails Admin API instead of a filesystem.
export class SklepikPageRepository implements PageRepository {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: SklepikPageRepositoryOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private url(): string {
    return `${this.options.baseUrl.replace(/\/$/, '')}/storefront_page`;
  }

  private headers(storeId: string): Record<string, string> {
    return {
      Authorization: `Bearer ${this.options.authToken}`,
      'X-Spree-Store-Id': storeId,
      'Content-Type': 'application/json',
    };
  }

  private toPage(storeId: string, body: AdminStorefrontPageResponse): Page {
    return PageSchema.parse({
      id: body.slug,
      storeId,
      themeId: DEFAULT_THEME_ID,
      type: 'homepage',
      slug: body.slug,
      name: body.title,
      sections: body.draft_document.sections,
    });
  }

  private async fetchRaw(storeId: string): Promise<AdminStorefrontPageResponse | null> {
    const response = await this.fetchImpl(this.url(), { headers: this.headers(storeId) });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`sklepik GET /storefront_page failed: ${response.status}`);
    return (await response.json()) as AdminStorefrontPageResponse;
  }

  async create(storeId: string, page: Page): Promise<Page> {
    if (page.id !== PAGE_ID) {
      throw new Error(
        `SklepikPageRepository only supports the single homepage document (id "${PAGE_ID}"); got "${page.id}". ` +
          'Rails does not yet have multi-page storage — see storefront-composition-system.md Open Questions.',
      );
    }
    // The Rails singleton lazily creates itself with defaults on first GET
    // (`find_or_create_by!`), so "create" here means writing the given content over that default.
    await this.fetchRaw(storeId);
    return this.update(storeId, PAGE_ID, page);
  }

  async read(storeId: string, pageId: string): Promise<Page | null> {
    if (pageId !== PAGE_ID) return null;
    const body = await this.fetchRaw(storeId);
    return body ? this.toPage(storeId, body) : null;
  }

  async update(storeId: string, pageId: string, updates: Partial<Page>): Promise<Page> {
    if (pageId !== PAGE_ID) throw new NotFoundError('Page', pageId);

    // Narrows the race window rather than closing it: fetches the current lock_version
    // immediately before writing, instead of trusting a version the caller may have loaded
    // minutes ago. A write landing between this GET and the PATCH below still wins silently —
    // see docs/ROADMAPA.md. GitHubPageRepository's sha-based conflict detection is the model to
    // follow if/when this needs to be closed properly (e.g. by threading lock_version through the
    // editor's own state instead of re-fetching here).
    const current = await this.fetchRaw(storeId);
    if (!current) throw new NotFoundError('Page', pageId);

    const merged = PageSchema.parse({ ...this.toPage(storeId, current), ...updates, id: PAGE_ID, storeId });

    const response = await this.fetchImpl(this.url(), {
      method: 'PATCH',
      headers: this.headers(storeId),
      body: JSON.stringify({
        title: merged.name,
        lock_version: current.lock_version,
        draft_document: { schemaVersion: 1, sections: merged.sections },
      }),
    });
    if (response.status === 409) {
      throw new Error('Page was changed in another session — reload before saving again (optimistic lock conflict).');
    }
    if (!response.ok) throw new Error(`sklepik PATCH /storefront_page failed: ${response.status}`);

    const body = (await response.json()) as AdminStorefrontPageResponse;
    return this.toPage(storeId, body);
  }

  async delete(_storeId: string, _pageId: string): Promise<void> {
    throw new Error('SklepikPageRepository does not support deleting the homepage — every store must have one.');
  }

  async listByStore(storeId: string): Promise<Page[]> {
    const body = await this.fetchRaw(storeId);
    return body ? [this.toPage(storeId, body)] : [];
  }

  /** Publishes the current draft as a new snapshot — no equivalent in the generic PageRepository interface. */
  async publish(storeId: string): Promise<Page> {
    const response = await this.fetchImpl(`${this.url()}/publish`, {
      method: 'POST',
      headers: this.headers(storeId),
    });
    if (!response.ok) throw new Error(`sklepik POST /storefront_page/publish failed: ${response.status}`);

    const body = (await response.json()) as AdminStorefrontPageResponse;
    return this.toPage(storeId, body);
  }
}
