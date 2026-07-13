import { describe, expect, it } from 'vitest';
import { PageSchema } from '../src/page.js';

describe('PageSchema', () => {
  it('parses a homepage document with an ordered list of sections', () => {
    const result = PageSchema.parse({
      id: 'page_1',
      storeId: 'store_1',
      themeId: 'theme_1',
      type: 'homepage',
      name: 'Homepage',
      sections: [
        { id: 'sec_1', type: 'hero', position: 0, preferences: { heading: 'Welcome' } },
        {
          id: 'sec_2',
          type: 'product_grid',
          position: 1,
          preferences: { heading: 'New arrivals' },
        },
        { id: 'sec_3', type: 'newsletter', position: 2, preferences: {} },
      ],
    });

    expect(result.sections).toHaveLength(3);
    expect(result.sections.map((s) => s.type)).toEqual(['hero', 'product_grid', 'newsletter']);
  });

  it('rejects a page with an unknown type', () => {
    const result = PageSchema.safeParse({
      id: 'page_2',
      storeId: 'store_1',
      themeId: 'theme_1',
      type: 'not-a-real-page-type',
      name: 'Broken',
    });

    expect(result.success).toBe(false);
  });

  it('defaults to an empty sections array when omitted', () => {
    const result = PageSchema.parse({
      id: 'page_3',
      storeId: 'store_1',
      themeId: 'theme_1',
      type: 'custom',
      name: 'Blank page',
    });

    expect(result.sections).toEqual([]);
  });
});
