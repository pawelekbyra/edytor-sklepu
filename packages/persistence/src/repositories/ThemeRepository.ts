import type { Theme } from '@editor/schema';

export interface ThemeRepository {
  create(storeId: string, theme: Theme): Promise<Theme>;
  read(storeId: string, themeId: string): Promise<Theme | null>;
  update(storeId: string, themeId: string, updates: Partial<Theme>): Promise<Theme>;
  delete(storeId: string, themeId: string): Promise<void>;
  listByStore(storeId: string): Promise<Theme[]>;
  setDefault(storeId: string, themeId: string): Promise<void>;
}
