import { SectionSchema } from '@editor/schema';
import { describe, expect, it } from 'vitest';
import { blockStyles, sectionStyles } from '../src/styles.js';

describe('sectionStyles', () => {
  it('maps style fields onto CSS properties', () => {
    const section = SectionSchema.parse({
      id: 'sec_1',
      type: 'hero',
      position: 0,
      preferences: {},
      style: { textColor: '#111111', backgroundColor: '#fff', topPadding: 20, bottomPadding: 10 },
    });

    const css = sectionStyles(section.style);
    expect(css.color).toBe('#111111');
    expect(css.backgroundColor).toBe('#fff');
    expect(css.paddingTop).toBe(20);
    expect(css.paddingBottom).toBe(10);
  });

  it('omits borderStyle when both border widths are zero', () => {
    const section = SectionSchema.parse({
      id: 'sec_1',
      type: 'hero',
      position: 0,
      preferences: {},
      style: { topBorderWidth: 0, bottomBorderWidth: 0 },
    });

    expect(sectionStyles(section.style).borderStyle).toBeUndefined();
  });

  it('sets borderStyle to solid when a border width is present (matches the schema default)', () => {
    const section = SectionSchema.parse({ id: 'sec_1', type: 'hero', position: 0, preferences: {} });
    expect(sectionStyles(section.style).borderStyle).toBe('solid');
  });
});

describe('blockStyles', () => {
  it('maps alignment/size/padding fields onto CSS properties', () => {
    const section = SectionSchema.parse({
      id: 'sec_1',
      type: 'hero',
      position: 0,
      preferences: {},
      blocks: [
        {
          id: 'blk_1',
          type: 'button',
          position: 0,
          preferences: { label: 'Buy', href: '/buy' },
          style: { textAlignment: 'center', containerAlignment: 'right', widthDesktop: 50 },
        },
      ],
    });
    if (section.type !== 'hero') throw new Error('expected hero');
    const block = section.blocks[0];
    if (!block) throw new Error('expected a block');

    const css = blockStyles(block.style);
    expect(css.textAlign).toBe('center');
    expect(css.justifyContent).toBe('flex-end');
    expect(css.width).toBe('50%');
  });
});
