import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type Page, PageSchema } from '@pawelekbyra/schema';
import { NotFoundError } from '../errors.js';
import type { PageRepository } from '../repositories/PageRepository.js';

// "Własne repo" mode implementation (see docs/ARCHITEKTURA.md "Kto jest źródłem prawdy"): page
// documents live as version-controllable JSON files in the storefront repo, one file per page:
//   {baseDir}/{storeId}/{pageId}.json
// This is deliberately the same `PageRepository` interface as the SQLite/API implementations — the
// point of the persistence abstraction is that the editor and renderer don't know which is behind it.
export class FilePageRepository implements PageRepository {
  constructor(private readonly baseDir: string) {}

  private storeDir(storeId: string): string {
    return join(this.baseDir, storeId);
  }

  private pagePath(storeId: string, pageId: string): string {
    return join(this.storeDir(storeId), `${pageId}.json`);
  }

  async create(storeId: string, page: Page): Promise<Page> {
    const row = PageSchema.parse({ ...page, storeId });
    await mkdir(this.storeDir(storeId), { recursive: true });
    await writeFile(this.pagePath(storeId, row.id), JSON.stringify(row, null, 2), 'utf8');
    return row;
  }

  async read(storeId: string, pageId: string): Promise<Page | null> {
    try {
      const raw = await readFile(this.pagePath(storeId, pageId), 'utf8');
      return PageSchema.parse(JSON.parse(raw));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  async update(storeId: string, pageId: string, updates: Partial<Page>): Promise<Page> {
    const existing = await this.read(storeId, pageId);
    if (!existing) throw new NotFoundError('Page', pageId);
    const merged = PageSchema.parse({ ...existing, ...updates, id: pageId, storeId });
    await writeFile(this.pagePath(storeId, pageId), JSON.stringify(merged, null, 2), 'utf8');
    return merged;
  }

  async delete(storeId: string, pageId: string): Promise<void> {
    const existing = await this.read(storeId, pageId);
    if (!existing) throw new NotFoundError('Page', pageId);
    await rm(this.pagePath(storeId, pageId));
  }

  async listByStore(storeId: string): Promise<Page[]> {
    let files: string[];
    try {
      files = await readdir(this.storeDir(storeId));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
    const pages = await Promise.all(
      files
        .filter((name) => name.endsWith('.json'))
        .map((name) => this.read(storeId, name.replace(/\.json$/, ''))),
    );
    return pages.filter((page): page is Page => page !== null).sort((a, b) => a.name.localeCompare(b.name));
  }
}
