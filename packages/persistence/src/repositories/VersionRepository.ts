import type { Page, PageVersion } from '@editor/schema';

// Replaces Rails' preview-record-duplication with explicit draft/published snapshots of a Page
// (see packages/schema/src/page-version.ts).
export interface VersionRepository {
  saveDraft(storeId: string, pageId: string, document: Page): Promise<PageVersion>;
  // Promotes the latest draft to published inside a single transaction.
  publish(storeId: string, pageId: string): Promise<PageVersion>;
  getVersion(storeId: string, versionId: string): Promise<PageVersion>;
  listVersions(storeId: string, pageId: string): Promise<PageVersion[]>;
}
