import { type Page, PageSchema } from '@pawelekbyra/schema';
import { NotFoundError } from '../errors.js';
import type { PageRepository } from '../repositories/PageRepository.js';

export interface GitHubPageRepositoryOptions {
  /** e.g. "pawelekbyra" */
  owner: string;
  /** e.g. "sklep-kakaowy-storefront" */
  repo: string;
  /** Fine-grained token with Contents: read+write on this repo. Never logged. */
  token: string;
  /** Defaults to the repo's default branch behaviour: we target this ref explicitly. */
  branch?: string;
  /** Path prefix inside the repo; documents land at `{contentDir}/{storeId}/{pageId}.json`. */
  contentDir?: string;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
}

interface ContentsResponse {
  content?: string;
  sha?: string;
}

// "Własne repo" mode, for real (docs/ARCHITEKTURA.md → „Kto jest źródłem prawdy"): page documents
// are committed to the shop's own storefront repo, and the deploy that follows publishes them.
// Handing the repo to the owner hands over their content too — which is the Store Factory
// definition-of-done ("repozytorium sklepu można przekazać klientowi").
//
// Deliberately the same PageRepository interface as the SQLite/File implementations: the editor
// does not know or care that publishing is a commit.
export class GitHubPageRepository implements PageRepository {
  private readonly fetchImpl: typeof fetch;
  private readonly contentDir: string;

  constructor(private readonly options: GitHubPageRepositoryOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.contentDir = options.contentDir ?? 'content';
  }

  private path(storeId: string, pageId: string): string {
    return `${this.contentDir}/${storeId}/${pageId}.json`;
  }

  private url(path: string): string {
    const { owner, repo } = this.options;
    return `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURI(path)}`;
  }

  private headers(): Record<string, string> {
    return {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${this.options.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  // Returns the file's decoded JSON plus its blob sha — GitHub requires the sha of the version you
  // are replacing, which is also what makes concurrent overwrites fail loudly instead of silently
  // clobbering someone else's edit.
  private async getFile(storeId: string, pageId: string): Promise<{ page: Page; sha: string } | null> {
    const branch = this.options.branch;
    const url = branch ? `${this.url(this.path(storeId, pageId))}?ref=${encodeURIComponent(branch)}` : this.url(this.path(storeId, pageId));

    const response = await this.fetchImpl(url, { headers: this.headers() });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub GET ${this.path(storeId, pageId)} failed: ${response.status}`);

    const body = (await response.json()) as ContentsResponse;
    if (!body.content || !body.sha) throw new Error(`GitHub returned no content for ${this.path(storeId, pageId)}`);

    const decoded = Buffer.from(body.content, 'base64').toString('utf8');
    return { page: PageSchema.parse(JSON.parse(decoded)), sha: body.sha };
  }

  private async putFile(storeId: string, page: Page, sha: string | undefined, message: string): Promise<void> {
    const response = await this.fetchImpl(this.url(this.path(storeId, page.id)), {
      method: 'PUT',
      headers: { ...this.headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        content: Buffer.from(`${JSON.stringify(page, null, 2)}\n`, 'utf8').toString('base64'),
        ...(sha ? { sha } : {}),
        ...(this.options.branch ? { branch: this.options.branch } : {}),
      }),
    });

    if (!response.ok) {
      // 409 here means the file moved underneath us (stale sha) — surfaced rather than retried,
      // because silently overwriting a concurrent edit is worse than an error the author can see.
      throw new Error(`GitHub PUT ${this.path(storeId, page.id)} failed: ${response.status}`);
    }
  }

  async create(storeId: string, page: Page): Promise<Page> {
    const row = PageSchema.parse({ ...page, storeId });
    await this.putFile(storeId, row, undefined, `feat(content): create page ${row.id}`);
    return row;
  }

  async read(storeId: string, pageId: string): Promise<Page | null> {
    const found = await this.getFile(storeId, pageId);
    return found?.page ?? null;
  }

  async update(storeId: string, pageId: string, updates: Partial<Page>): Promise<Page> {
    const existing = await this.getFile(storeId, pageId);
    if (!existing) throw new NotFoundError('Page', pageId);

    const merged = PageSchema.parse({ ...existing.page, ...updates, id: pageId, storeId });
    await this.putFile(storeId, merged, existing.sha, `content: update page ${pageId}`);
    return merged;
  }

  async delete(storeId: string, pageId: string): Promise<void> {
    const existing = await this.getFile(storeId, pageId);
    if (!existing) throw new NotFoundError('Page', pageId);

    const response = await this.fetchImpl(this.url(this.path(storeId, pageId)), {
      method: 'DELETE',
      headers: { ...this.headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `content: delete page ${pageId}`,
        sha: existing.sha,
        ...(this.options.branch ? { branch: this.options.branch } : {}),
      }),
    });
    if (!response.ok) throw new Error(`GitHub DELETE ${this.path(storeId, pageId)} failed: ${response.status}`);
  }

  async listByStore(storeId: string): Promise<Page[]> {
    const dir = `${this.contentDir}/${storeId}`;
    const branch = this.options.branch;
    const url = branch ? `${this.url(dir)}?ref=${encodeURIComponent(branch)}` : this.url(dir);

    const response = await this.fetchImpl(url, { headers: this.headers() });
    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`GitHub GET ${dir} failed: ${response.status}`);

    const entries = (await response.json()) as Array<{ name: string; type: string }>;
    const pageIds = entries
      .filter((entry) => entry.type === 'file' && entry.name.endsWith('.json'))
      .map((entry) => entry.name.replace(/\.json$/, ''));

    const pages = await Promise.all(pageIds.map((pageId) => this.read(storeId, pageId)));
    return pages.filter((page): page is Page => page !== null).sort((a, b) => a.name.localeCompare(b.name));
  }
}
