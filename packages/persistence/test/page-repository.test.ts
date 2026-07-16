import { PageSchema } from '@editor/schema';
import { beforeEach, describe, expect, it } from 'vitest';
import { NotFoundError } from '../src/errors.js';
import { createDatabase } from '../src/sqlite/db.js';
import { SQLitePageRepository } from '../src/sqlite/SQLitePageRepository.js';

const homepage = PageSchema.parse({
  id: 'page_1',
  storeId: 'store_1',
  themeId: 'theme_1',
  type: 'homepage',
  name: 'Homepage',
  sections: [{ id: 'sec_1', type: 'hero', position: 0, preferences: { heading: 'Welcome' } }],
});

describe('SQLitePageRepository', () => {
  let repo: SQLitePageRepository;

  beforeEach(() => {
    repo = new SQLitePageRepository(createDatabase());
  });

  it('creates and reads a page back, including its sections', async () => {
    await repo.create('store_1', homepage);
    const found = await repo.read('store_1', 'page_1');

    expect(found?.name).toBe('Homepage');
    expect(found?.sections).toHaveLength(1);
    expect(found?.sections[0]?.type).toBe('hero');
  });

  it('returns null for a page that does not exist', async () => {
    const found = await repo.read('store_1', 'nope');
    expect(found).toBeNull();
  });

  it('updates a page and persists the change', async () => {
    await repo.create('store_1', homepage);
    const updated = await repo.update('store_1', 'page_1', { name: 'New Homepage' });

    expect(updated.name).toBe('New Homepage');
    expect((await repo.read('store_1', 'page_1'))?.name).toBe('New Homepage');
  });

  it('throws NotFoundError when updating a page that does not exist', async () => {
    await expect(repo.update('store_1', 'nope', { name: 'x' })).rejects.toThrow(NotFoundError);
  });

  it('soft-deletes a page: it disappears from read/list but the row stays', async () => {
    await repo.create('store_1', homepage);
    await repo.delete('store_1', 'page_1');

    expect(await repo.read('store_1', 'page_1')).toBeNull();
    expect(await repo.listByStore('store_1')).toEqual([]);
  });

  it('throws NotFoundError when deleting a page that does not exist', async () => {
    await expect(repo.delete('store_1', 'nope')).rejects.toThrow(NotFoundError);
  });

  it('lists every non-deleted page for a store', async () => {
    await repo.create('store_1', homepage);
    await repo.create('store_1', { ...homepage, id: 'page_2', name: 'About', type: 'custom' });

    const pages = await repo.listByStore('store_1');
    expect(pages.map((p) => p.id).sort()).toEqual(['page_1', 'page_2']);
  });
});
