import type { Page } from '@editor/schema';

// The only implementation that changes when integrating with `sklepik`: swap SQLitePageRepository
// for an API-client implementation of this same interface (see docs/INSTRUKCJA_INTEGRACJI.md).
export interface PageRepository {
  create(storeId: string, page: Page): Promise<Page>;
  read(storeId: string, pageId: string): Promise<Page | null>;
  update(storeId: string, pageId: string, updates: Partial<Page>): Promise<Page>;
  delete(storeId: string, pageId: string): Promise<void>;
  listByStore(storeId: string): Promise<Page[]>;
}
