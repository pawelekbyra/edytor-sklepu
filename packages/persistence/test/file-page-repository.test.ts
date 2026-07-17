import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PageSchema } from '@pawelekbyra/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NotFoundError } from '../src/errors.js';
import { FilePageRepository } from '../src/file/FilePageRepository.js';

const homepage = PageSchema.parse({
  id: 'page_home',
  storeId: 'store_1',
  themeId: 'theme_1',
  type: 'homepage',
  name: 'Homepage',
  sections: [{ id: 'sec_1', type: 'hero', position: 0, preferences: { heading: 'Cześć' } }],
});

describe('FilePageRepository', () => {
  let dir: string;
  let repo: FilePageRepository;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'editor-file-repo-'));
    repo = new FilePageRepository(dir);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('creates a page as JSON and reads it back, preserving sections', async () => {
    await repo.create('store_1', homepage);
    const found = await repo.read('store_1', 'page_home');

    expect(found?.name).toBe('Homepage');
    expect(found?.sections[0]?.type).toBe('hero');
  });

  it('returns null for a missing page (not a throw)', async () => {
    expect(await repo.read('store_1', 'nope')).toBeNull();
  });

  it('updates a page on disk', async () => {
    await repo.create('store_1', homepage);
    const updated = await repo.update('store_1', 'page_home', { name: 'Strona główna' });
    expect(updated.name).toBe('Strona główna');
    expect((await repo.read('store_1', 'page_home'))?.name).toBe('Strona główna');
  });

  it('throws NotFoundError updating/deleting a missing page', async () => {
    await expect(repo.update('store_1', 'nope', { name: 'x' })).rejects.toThrow(NotFoundError);
    await expect(repo.delete('store_1', 'nope')).rejects.toThrow(NotFoundError);
  });

  it('deletes a page file', async () => {
    await repo.create('store_1', homepage);
    await repo.delete('store_1', 'page_home');
    expect(await repo.read('store_1', 'page_home')).toBeNull();
  });

  it('lists pages for a store and isolates stores by directory', async () => {
    await repo.create('store_1', homepage);
    await repo.create('store_1', { ...homepage, id: 'page_about', name: 'O nas', type: 'custom' });
    await repo.create('store_2', { ...homepage, storeId: 'store_2' });

    const store1 = await repo.listByStore('store_1');
    expect(store1.map((p) => p.id).sort()).toEqual(['page_about', 'page_home']);
    expect(await repo.listByStore('store_2')).toHaveLength(1);
  });

  it('lists empty for an unknown store', async () => {
    expect(await repo.listByStore('ghost')).toEqual([]);
  });
});
