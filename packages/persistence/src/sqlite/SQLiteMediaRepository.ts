import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { NotFoundError } from '../errors.js';
import type { MediaRepository } from '../repositories/MediaRepository.js';
import type { Media } from '../types.js';

interface MediaRow {
  id: string;
  store_id: string;
  url: string;
  filename: string;
  content_type: string;
  size: number;
  created_at: string;
}

function rowToMedia(row: MediaRow): Media {
  return {
    id: row.id,
    storeId: row.store_id,
    url: row.url,
    filename: row.filename,
    contentType: row.content_type,
    size: row.size,
    createdAt: row.created_at,
  };
}

// Demo implementation: stores metadata only, no real object storage. Uploaded bytes are
// discarded — `url` is a synthetic path, good enough to exercise the editor's media picker.
export class SQLiteMediaRepository implements MediaRepository {
  constructor(private readonly db: DatabaseSync) {}

  async upload(storeId: string, file: File): Promise<{ id: string; url: string }> {
    const id = `media_${randomUUID()}`;
    const url = `/media/${storeId}/${id}/${file.name}`;
    this.db
      .prepare(
        `INSERT INTO media (id, store_id, url, filename, content_type, size, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, storeId, url, file.name, file.type, file.size, new Date().toISOString());
    return { id, url };
  }

  async delete(storeId: string, mediaId: string): Promise<void> {
    const result = this.db
      .prepare('DELETE FROM media WHERE id = ? AND store_id = ?')
      .run(mediaId, storeId);
    if (result.changes === 0) throw new NotFoundError('Media', mediaId);
  }

  async listByStore(storeId: string): Promise<Media[]> {
    const rows = this.db
      .prepare('SELECT * FROM media WHERE store_id = ? ORDER BY created_at DESC')
      .all(storeId) as unknown as MediaRow[];
    return rows.map(rowToMedia);
  }
}
