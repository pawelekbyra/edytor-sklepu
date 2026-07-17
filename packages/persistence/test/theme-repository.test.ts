import { ThemeSchema } from '@pawelekbyra/schema';
import { beforeEach, describe, expect, it } from 'vitest';
import { NotFoundError } from '../src/errors.js';
import { createDatabase } from '../src/sqlite/db.js';
import { SQLiteThemeRepository } from '../src/sqlite/SQLiteThemeRepository.js';

const defaultTheme = ThemeSchema.parse({ id: 'theme_1', storeId: 'store_1', name: 'Default', isDefault: true });
const secondTheme = ThemeSchema.parse({ id: 'theme_2', storeId: 'store_1', name: 'Seasonal' });

describe('SQLiteThemeRepository', () => {
  let repo: SQLiteThemeRepository;

  beforeEach(() => {
    repo = new SQLiteThemeRepository(createDatabase());
  });

  it('creates and reads a theme back', async () => {
    await repo.create('store_1', defaultTheme);
    const found = await repo.read('store_1', 'theme_1');

    expect(found?.name).toBe('Default');
    expect(found?.isDefault).toBe(true);
  });

  it('updates a theme', async () => {
    await repo.create('store_1', defaultTheme);
    const updated = await repo.update('store_1', 'theme_1', { name: 'Rebrand' });
    expect(updated.name).toBe('Rebrand');
  });

  it('throws NotFoundError updating/deleting a theme that does not exist', async () => {
    await expect(repo.update('store_1', 'nope', { name: 'x' })).rejects.toThrow(NotFoundError);
    await expect(repo.delete('store_1', 'nope')).rejects.toThrow(NotFoundError);
  });

  it('soft-deletes a theme', async () => {
    await repo.create('store_1', defaultTheme);
    await repo.delete('store_1', 'theme_1');
    expect(await repo.read('store_1', 'theme_1')).toBeNull();
  });

  it('lists themes for a store', async () => {
    await repo.create('store_1', defaultTheme);
    await repo.create('store_1', secondTheme);
    expect((await repo.listByStore('store_1')).map((t) => t.id).sort()).toEqual(['theme_1', 'theme_2']);
  });

  it('setDefault makes exactly one theme the default per store', async () => {
    await repo.create('store_1', defaultTheme);
    await repo.create('store_1', secondTheme);

    await repo.setDefault('store_1', 'theme_2');

    const themes = await repo.listByStore('store_1');
    const defaults = themes.filter((t) => t.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0]?.id).toBe('theme_2');
  });

  it('setDefault throws NotFoundError for an unknown theme, leaving the existing default untouched', async () => {
    await repo.create('store_1', defaultTheme);

    await expect(repo.setDefault('store_1', 'nope')).rejects.toThrow(NotFoundError);
    expect((await repo.read('store_1', 'theme_1'))?.isDefault).toBe(true);
  });
});
