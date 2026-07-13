import { describe, expect, it } from 'vitest';
import { PageVersionSchema } from '../src/page-version.js';

const baseDocument = {
  id: 'page_1',
  storeId: 'store_1',
  themeId: 'theme_1',
  type: 'homepage' as const,
  name: 'Homepage',
  sections: [],
};

describe('PageVersionSchema', () => {
  it('allows a draft version without publishedAt', () => {
    const result = PageVersionSchema.safeParse({
      id: 'ver_1',
      pageId: 'page_1',
      status: 'draft',
      document: baseDocument,
      createdAt: new Date().toISOString(),
    });

    expect(result.success).toBe(true);
  });

  it('rejects a published version without publishedAt', () => {
    const result = PageVersionSchema.safeParse({
      id: 'ver_2',
      pageId: 'page_1',
      status: 'published',
      document: baseDocument,
      createdAt: new Date().toISOString(),
    });

    expect(result.success).toBe(false);
  });

  it('allows a published version with publishedAt set', () => {
    const now = new Date().toISOString();
    const result = PageVersionSchema.safeParse({
      id: 'ver_3',
      pageId: 'page_1',
      status: 'published',
      document: baseDocument,
      createdAt: now,
      publishedAt: now,
    });

    expect(result.success).toBe(true);
  });
});
