import { PageSchema, ThemeSchema } from '@pawelekbyra/schema';
import { beforeEach, describe, expect, it } from 'vitest';
import { NotFoundError } from '../src/errors.js';
import type { DatabaseSync } from 'node:sqlite';
import { createDatabase } from '../src/sqlite/db.js';
import { SQLiteMediaRepository } from '../src/sqlite/SQLiteMediaRepository.js';
import { SQLitePageRepository } from '../src/sqlite/SQLitePageRepository.js';
import { SQLiteThemeRepository } from '../src/sqlite/SQLiteThemeRepository.js';
import { SQLiteVersionRepository } from '../src/sqlite/SQLiteVersionRepository.js';

// Every repository shares one physical database in the demo — storeId scoping in the SQL, not a
// separate database per tenant, is what has to hold the line between stores.
describe('cross-store isolation', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = createDatabase();
  });

  it('a page created in store_1 is invisible to store_2', async () => {
    const pages = new SQLitePageRepository(db);
    await pages.create(
      'store_1',
      PageSchema.parse({ id: 'page_1', storeId: 'store_1', themeId: 'theme_1', type: 'homepage', name: 'Homepage' }),
    );

    expect(await pages.read('store_2', 'page_1')).toBeNull();
    expect(await pages.listByStore('store_2')).toEqual([]);
    await expect(pages.update('store_2', 'page_1', { name: 'Hijacked' })).rejects.toThrow(NotFoundError);
    await expect(pages.delete('store_2', 'page_1')).rejects.toThrow(NotFoundError);
  });

  it('a theme created in store_1 is invisible to store_2, including setDefault', async () => {
    const themes = new SQLiteThemeRepository(db);
    await themes.create('store_1', ThemeSchema.parse({ id: 'theme_1', storeId: 'store_1', name: 'Default' }));

    expect(await themes.read('store_2', 'theme_1')).toBeNull();
    await expect(themes.setDefault('store_2', 'theme_1')).rejects.toThrow(NotFoundError);
  });

  it('page versions are scoped by storeId even if the pageId collides across stores', async () => {
    const versions = new SQLiteVersionRepository(db);
    const store1Doc = PageSchema.parse({
      id: 'page_1',
      storeId: 'store_1',
      themeId: 'theme_1',
      type: 'homepage',
      name: 'Store 1 Homepage',
    });
    const store2Doc = PageSchema.parse({
      id: 'page_1',
      storeId: 'store_2',
      themeId: 'theme_1',
      type: 'homepage',
      name: 'Store 2 Homepage',
    });

    const store1Draft = await versions.saveDraft('store_1', 'page_1', store1Doc);
    await versions.saveDraft('store_2', 'page_1', store2Doc);

    const store1Versions = await versions.listVersions('store_1', 'page_1');
    expect(store1Versions).toHaveLength(1);
    expect(store1Versions[0]?.document.name).toBe('Store 1 Homepage');

    await expect(versions.getVersion('store_2', store1Draft.id)).rejects.toThrow(NotFoundError);
  });

  it('media uploaded for store_1 does not appear in store_2 listings', async () => {
    const media = new SQLiteMediaRepository(db);
    await media.upload('store_1', new File(['x'], 'a.png', { type: 'image/png' }));

    expect(await media.listByStore('store_2')).toEqual([]);
  });
});
