import { beforeEach, describe, expect, it } from 'vitest';
import { NotFoundError } from '../src/errors.js';
import { createDatabase } from '../src/sqlite/db.js';
import { SQLiteMediaRepository } from '../src/sqlite/SQLiteMediaRepository.js';

describe('SQLiteMediaRepository', () => {
  let repo: SQLiteMediaRepository;

  beforeEach(() => {
    repo = new SQLiteMediaRepository(createDatabase());
  });

  it('uploads a file and returns an id + url', async () => {
    const file = new File(['fake-bytes'], 'hero.png', { type: 'image/png' });
    const result = await repo.upload('store_1', file);

    expect(result.id).toMatch(/^media_/);
    expect(result.url).toContain('hero.png');
  });

  it('lists uploaded media for a store with metadata intact', async () => {
    const file = new File(['fake-bytes'], 'hero.png', { type: 'image/png' });
    await repo.upload('store_1', file);

    const media = await repo.listByStore('store_1');
    expect(media).toHaveLength(1);
    expect(media[0]?.filename).toBe('hero.png');
    expect(media[0]?.contentType).toBe('image/png');
  });

  it('deletes media', async () => {
    const file = new File(['fake-bytes'], 'hero.png', { type: 'image/png' });
    const { id } = await repo.upload('store_1', file);

    await repo.delete('store_1', id);
    expect(await repo.listByStore('store_1')).toEqual([]);
  });

  it('throws NotFoundError deleting media that does not exist', async () => {
    await expect(repo.delete('store_1', 'nope')).rejects.toThrow(NotFoundError);
  });
});
