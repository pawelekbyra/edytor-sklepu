import { PageSchema } from '@pawelekbyra/schema';
import { describe, expect, it } from 'vitest';
import { CommandStack } from '../src/CommandStack.js';
import { MoveBlockCommand } from '../src/commands/MoveBlockCommand.js';

const page = PageSchema.parse({
  id: 'page_1',
  storeId: 'store_1',
  themeId: 'theme_1',
  type: 'homepage',
  name: 'Homepage',
  sections: [
    {
      id: 'sec_hero',
      type: 'hero',
      position: 0,
      preferences: {},
      blocks: [
        { id: 'blk_a', type: 'button', position: 0, preferences: { label: 'A', href: '/a' } },
        { id: 'blk_b', type: 'button', position: 1, preferences: { label: 'B', href: '/b' } },
      ],
    },
    { id: 'sec_grid', type: 'product_grid', position: 1, preferences: {} },
  ],
});

function blockOrder(p: typeof page): string[] {
  const hero = p.sections.find((s) => s.id === 'sec_hero');
  if (!hero || !('blocks' in hero)) throw new Error('expected hero with blocks');
  return [...hero.blocks].sort((a, b) => a.position - b.position).map((b) => b.id);
}

describe('MoveBlockCommand', () => {
  it('moves a block within its section and reassigns contiguous positions', () => {
    const stack = new CommandStack(page);
    const result = stack.execute(new MoveBlockCommand('sec_hero', 'blk_b', 0));
    expect(blockOrder(result)).toEqual(['blk_b', 'blk_a']);
  });

  it('undo restores the original block order', () => {
    const stack = new CommandStack(page);
    stack.execute(new MoveBlockCommand('sec_hero', 'blk_b', 0));
    const result = stack.undo();
    expect(blockOrder(result)).toEqual(['blk_a', 'blk_b']);
  });

  it('throws when the section does not support blocks', () => {
    const stack = new CommandStack(page);
    expect(() => stack.execute(new MoveBlockCommand('sec_grid', 'blk_a', 0))).toThrow(
      'does not support blocks',
    );
  });

  it('throws for a block id that does not exist', () => {
    const stack = new CommandStack(page);
    expect(() => stack.execute(new MoveBlockCommand('sec_hero', 'nope', 0))).toThrow(
      'Block "nope" not found',
    );
  });
});
