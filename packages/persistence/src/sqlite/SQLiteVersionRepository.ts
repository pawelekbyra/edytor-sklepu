import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { type Page, type PageVersion, PageVersionSchema } from '@pawelekbyra/schema';
import { NotFoundError } from '../errors.js';
import type { VersionRepository } from '../repositories/VersionRepository.js';
import { withTransaction } from './db.js';

interface VersionRow {
  id: string;
  store_id: string;
  page_id: string;
  status: 'draft' | 'published';
  document_json: string;
  created_at: string;
  published_at: string | null;
}

function rowToVersion(row: VersionRow): PageVersion {
  return PageVersionSchema.parse({
    id: row.id,
    pageId: row.page_id,
    status: row.status,
    document: JSON.parse(row.document_json),
    createdAt: row.created_at,
    publishedAt: row.published_at,
  });
}

export class SQLiteVersionRepository implements VersionRepository {
  constructor(private readonly db: DatabaseSync) {}

  async saveDraft(storeId: string, pageId: string, document: Page): Promise<PageVersion> {
    const version = PageVersionSchema.parse({
      id: `ver_${randomUUID()}`,
      pageId,
      status: 'draft',
      document: { ...document, id: pageId, storeId },
      createdAt: new Date().toISOString(),
    });
    this.db
      .prepare(
        `INSERT INTO page_versions (id, store_id, page_id, status, document_json, created_at, published_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL)`,
      )
      .run(version.id, storeId, pageId, version.status, JSON.stringify(version.document), version.createdAt);
    return version;
  }

  async publish(storeId: string, pageId: string): Promise<PageVersion> {
    return withTransaction(this.db, () => {
      const draftRow = this.db
        .prepare(
          `SELECT * FROM page_versions WHERE store_id = ? AND page_id = ? AND status = 'draft'
           ORDER BY created_at DESC LIMIT 1`,
        )
        .get(storeId, pageId) as VersionRow | undefined;
      if (!draftRow) throw new NotFoundError('Draft version for page', pageId);

      const publishedAt = new Date().toISOString();
      this.db
        .prepare(`UPDATE page_versions SET status = 'published', published_at = ? WHERE id = ? AND store_id = ?`)
        .run(publishedAt, draftRow.id, storeId);

      return rowToVersion({ ...draftRow, status: 'published', published_at: publishedAt });
    });
  }

  async getVersion(storeId: string, versionId: string): Promise<PageVersion> {
    const row = this.db
      .prepare('SELECT * FROM page_versions WHERE id = ? AND store_id = ?')
      .get(versionId, storeId) as VersionRow | undefined;
    if (!row) throw new NotFoundError('PageVersion', versionId);
    return rowToVersion(row);
  }

  async listVersions(storeId: string, pageId: string): Promise<PageVersion[]> {
    const rows = this.db
      .prepare('SELECT * FROM page_versions WHERE store_id = ? AND page_id = ? ORDER BY created_at DESC')
      .all(storeId, pageId) as unknown as VersionRow[];
    return rows.map(rowToVersion);
  }
}
