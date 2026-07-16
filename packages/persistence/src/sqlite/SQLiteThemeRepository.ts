import type { DatabaseSync } from 'node:sqlite';
import { type Theme, ThemeSchema } from '@editor/schema';
import { NotFoundError } from '../errors.js';
import type { ThemeRepository } from '../repositories/ThemeRepository.js';
import { withTransaction } from './db.js';

interface ThemeRow {
  id: string;
  store_id: string;
  name: string;
  is_default: number;
  layout_sections_json: string;
}

function rowToTheme(row: ThemeRow): Theme {
  return ThemeSchema.parse({
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    isDefault: row.is_default === 1,
    layoutSections: JSON.parse(row.layout_sections_json),
  });
}

export class SQLiteThemeRepository implements ThemeRepository {
  constructor(private readonly db: DatabaseSync) {}

  async create(storeId: string, theme: Theme): Promise<Theme> {
    const row = ThemeSchema.parse({ ...theme, storeId });
    this.db
      .prepare(
        `INSERT INTO themes (id, store_id, name, is_default, layout_sections_json)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(row.id, row.storeId, row.name, row.isDefault ? 1 : 0, JSON.stringify(row.layoutSections));
    return row;
  }

  async read(storeId: string, themeId: string): Promise<Theme | null> {
    const row = this.db
      .prepare('SELECT * FROM themes WHERE id = ? AND store_id = ? AND deleted_at IS NULL')
      .get(themeId, storeId) as ThemeRow | undefined;
    return row ? rowToTheme(row) : null;
  }

  async update(storeId: string, themeId: string, updates: Partial<Theme>): Promise<Theme> {
    const existing = await this.read(storeId, themeId);
    if (!existing) throw new NotFoundError('Theme', themeId);

    const merged = ThemeSchema.parse({ ...existing, ...updates, id: themeId, storeId });
    this.db
      .prepare(
        `UPDATE themes SET name = ?, is_default = ?, layout_sections_json = ?
         WHERE id = ? AND store_id = ?`,
      )
      .run(merged.name, merged.isDefault ? 1 : 0, JSON.stringify(merged.layoutSections), themeId, storeId);
    return merged;
  }

  async delete(storeId: string, themeId: string): Promise<void> {
    const result = this.db
      .prepare('UPDATE themes SET deleted_at = ? WHERE id = ? AND store_id = ? AND deleted_at IS NULL')
      .run(new Date().toISOString(), themeId, storeId);
    if (result.changes === 0) throw new NotFoundError('Theme', themeId);
  }

  async listByStore(storeId: string): Promise<Theme[]> {
    const rows = this.db
      .prepare('SELECT * FROM themes WHERE store_id = ? AND deleted_at IS NULL ORDER BY name')
      .all(storeId) as unknown as ThemeRow[];
    return rows.map(rowToTheme);
  }

  async setDefault(storeId: string, themeId: string): Promise<void> {
    withTransaction(this.db, () => {
      const target = this.db
        .prepare('SELECT id FROM themes WHERE id = ? AND store_id = ? AND deleted_at IS NULL')
        .get(themeId, storeId);
      if (!target) throw new NotFoundError('Theme', themeId);

      this.db.prepare('UPDATE themes SET is_default = 0 WHERE store_id = ?').run(storeId);
      this.db
        .prepare('UPDATE themes SET is_default = 1 WHERE id = ? AND store_id = ?')
        .run(themeId, storeId);
    });
  }
}
