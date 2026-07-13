import { describe, expect, it } from 'vitest';
import { SectionSchema } from '../src/section.js';

describe('SectionSchema', () => {
  it('parses a valid hero section and fills in style defaults', () => {
    const result = SectionSchema.parse({
      id: 'sec_1',
      type: 'hero',
      position: 0,
      preferences: { heading: 'Welcome' },
      blocks: [],
    });

    expect(result.type).toBe('hero');
    expect(result.style.topPadding).toBe(40);
    expect(result.style.bottomPadding).toBe(40);
    expect(result.style.topBorderWidth).toBe(1);
    expect(result.style.bottomBorderWidth).toBe(0);
  });

  it('rejects an unknown section type', () => {
    const result = SectionSchema.safeParse({
      id: 'sec_2',
      type: 'not_a_real_section',
      position: 0,
      preferences: {},
    });

    expect(result.success).toBe(false);
  });

  it('applies image_banner defaults matching the legacy Rails ImageBanner constants', () => {
    const result = SectionSchema.parse({
      id: 'sec_3',
      type: 'image_banner',
      position: 1,
      preferences: {},
    });

    if (result.type !== 'image_banner') throw new Error('expected image_banner');
    expect(result.preferences.heightPx).toBe(384);
    expect(result.preferences.overlayTransparency).toBe(40);
    expect(result.preferences.verticalAlignment).toBe('middle');
  });

  it('requires at least one item for faq preferences item entries', () => {
    const result = SectionSchema.safeParse({
      id: 'sec_4',
      type: 'faq',
      position: 2,
      preferences: { items: [{ question: '', answer: 'A' }] },
    });

    expect(result.success).toBe(false);
  });
});
