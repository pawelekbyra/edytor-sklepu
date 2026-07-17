import type { DatabaseSync } from 'node:sqlite';
import { type Page, PageSchema } from '@pawelekbyra/schema';
import { NotFoundError } from '../errors.js';
import type { PageRepository } from '../repositories/PageRepository.js';

interface PageRow {
  id: string;
  store_id: string;
  theme_id: string;
  type: string;
  slug: string | null;
  name: string;
  sections_json: string;
}

function rowToPage(row: PageRow): Page {
  return PageSchema.parse({
    id: row.id,
    storeId: row.store_id,
    themeId: row.theme_id,
    type: row.type,
    slug: row.slug,
    name: row.name,
    sections: JSON.parse(row.sections_json),
  });
}

export class SQLitePageRepository implements PageRepository {
  constructor(private readonly db: DatabaseSync) {}

  async create(storeId: string, page: Page): Promise<Page> {
    const row = PageSchema.parse({ ...page, storeId });
    this.db
      .prepare(
        `INSERT INTO pages (id, store_id, theme_id, type, slug, name, sections_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(row.id, row.storeId, row.themeId, row.type, row.slug, row.name, JSON.stringify(row.sections));
    return row;
  }

  async read(storeId: string, pageId: string): Promise<Page | null> {
    const row = this.db
      .prepare('SELECT * FROM pages WHERE id = ? AND store_id = ? AND deleted_at IS NULL')
      .get(pageId, storeId) as PageRow | undefined;
    return row ? rowToPage(row) : null;
  }

  async update(storeId: string, pageId: string, updates: Partial<Page>): Promise<Page> {
    const existing = await this.read(storeId, pageId);
    if (!existing) throw new NotFoundError('Page', pageId);

    const merged = PageSchema.parse({ ...existing, ...updates, id: pageId, storeId });
    this.db
      .prepare(
        `UPDATE pages SET theme_id = ?, type = ?, slug = ?, name = ?, sections_json = ?
         WHERE id = ? AND store_id = ?`,
      )
      .run(merged.themeId, merged.type, merged.slug, merged.name, JSON.stringify(merged.sections), pageId, storeId);
    return merged;
  }

  async delete(storeId: string, pageId: string): Promise<void> {
    const result = this.db
      .prepare('UPDATE pages SET deleted_at = ? WHERE id = ? AND store_id = ? AND deleted_at IS NULL')
      .run(new Date().toISOString(), pageId, storeId);
    if (result.changes === 0) throw new NotFoundError('Page', pageId);
  }

  async listByStore(storeId: string): Promise<Page[]> {
    const rows = this.db
      .prepare('SELECT * FROM pages WHERE store_id = ? AND deleted_at IS NULL ORDER BY name')
      .all(storeId) as unknown as PageRow[];
    return rows.map(rowToPage);
  }
}
