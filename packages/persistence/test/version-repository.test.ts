import { PageSchema } from '@editor/schema';
import { beforeEach, describe, expect, it } from 'vitest';
import { NotFoundError } from '../src/errors.js';
import { createDatabase } from '../src/sqlite/db.js';
import { SQLiteVersionRepository } from '../src/sqlite/SQLiteVersionRepository.js';

const homepage = PageSchema.parse({
  id: 'page_1',
  storeId: 'store_1',
  themeId: 'theme_1',
  type: 'homepage',
  name: 'Homepage',
  sections: [],
});

describe('SQLiteVersionRepository', () => {
  let repo: SQLiteVersionRepository;

  beforeEach(() => {
    repo = new SQLiteVersionRepository(createDatabase());
  });

  it('saves a draft version with no publishedAt', async () => {
    const version = await repo.saveDraft('store_1', 'page_1', homepage);
    expect(version.status).toBe('draft');
    expect(version.publishedAt).toBeNull();
  });

  it('publish() promotes the latest draft to published', async () => {
    await repo.saveDraft('store_1', 'page_1', homepage);
    const published = await repo.publish('store_1', 'page_1');

    expect(published.status).toBe('published');
    expect(published.publishedAt).not.toBeNull();
  });

  it('publish() throws NotFoundError when there is no draft to promote', async () => {
    await expect(repo.publish('store_1', 'page_1')).rejects.toThrow(NotFoundError);
  });

  it('publish() promotes only the most recent draft', async () => {
    await repo.saveDraft('store_1', 'page_1', homepage);
    await new Promise((resolve) => setTimeout(resolve, 2));
    const secondDraft = await repo.saveDraft('store_1', 'page_1', { ...homepage, name: 'Homepage v2' });

    const published = await repo.publish('store_1', 'page_1');
    expect(published.id).toBe(secondDraft.id);
    expect(published.document.name).toBe('Homepage v2');
  });

  it('listVersions returns full history, newest first', async () => {
    await repo.saveDraft('store_1', 'page_1', homepage);
    await new Promise((resolve) => setTimeout(resolve, 2));
    const second = await repo.saveDraft('store_1', 'page_1', homepage);

    const versions = await repo.listVersions('store_1', 'page_1');
    expect(versions).toHaveLength(2);
    expect(versions[0]?.id).toBe(second.id);
  });

  it('getVersion fetches a specific version by id', async () => {
    const draft = await repo.saveDraft('store_1', 'page_1', homepage);
    const found = await repo.getVersion('store_1', draft.id);
    expect(found.id).toBe(draft.id);
  });

  it('getVersion throws NotFoundError for an unknown id', async () => {
    await expect(repo.getVersion('store_1', 'nope')).rejects.toThrow(NotFoundError);
  });
});
