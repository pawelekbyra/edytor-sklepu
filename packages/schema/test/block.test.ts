import { describe, expect, it } from 'vitest';
import { BlockSchema } from '../src/block.js';

describe('BlockSchema', () => {
  it('parses a valid button block and fills in style defaults matching Rails PageBlock', () => {
    const result = BlockSchema.parse({
      id: 'blk_1',
      type: 'button',
      position: 0,
      preferences: { label: 'Shop now', href: '/shop-all' },
    });

    expect(result.type).toBe('button');
    expect(result.style.textAlignment).toBe('left');
    expect(result.style.containerAlignment).toBe('left');
    expect(result.style.size).toBe('medium');
    expect(result.style.widthDesktop).toBe(100);
  });

  it('rejects a button block missing a required href', () => {
    const result = BlockSchema.safeParse({
      id: 'blk_2',
      type: 'button',
      position: 0,
      preferences: { label: 'Shop now' },
    });

    expect(result.success).toBe(false);
  });

  it('rejects widthDesktop outside the 1-100 range', () => {
    const result = BlockSchema.safeParse({
      id: 'blk_3',
      type: 'image',
      position: 0,
      preferences: {},
      style: { widthDesktop: 150 },
    });

    expect(result.success).toBe(false);
  });
});
