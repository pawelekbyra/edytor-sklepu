import { PageSchema } from '@pawelekbyra/schema';
import { describe, expect, it } from 'vitest';
import { CommandStack } from '../src/CommandStack.js';
import { UpdateBlockCommand } from '../src/commands/UpdateBlockCommand.js';

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
      blocks: [{ id: 'blk_a', type: 'button', position: 0, preferences: { label: 'Old', href: '/old' } }],
    },
    { id: 'sec_grid', type: 'product_grid', position: 1, preferences: {} },
  ],
});

function blockPreferences(p: typeof page) {
  const hero = p.sections.find((s) => s.id === 'sec_hero');
  if (!hero || !('blocks' in hero)) throw new Error('expected hero with blocks');
  const block = hero.blocks[0];
  if (!block || block.type !== 'button') throw new Error('expected button block');
  return block.preferences;
}

describe('UpdateBlockCommand', () => {
  it('merges a patch into existing block preferences', () => {
    const stack = new CommandStack(page);
    const result = stack.execute(new UpdateBlockCommand('sec_hero', 'blk_a', { label: 'New' }));

    expect(blockPreferences(result).label).toBe('New');
    expect(blockPreferences(result).href).toBe('/old');
  });

  it('undo restores the exact previous preferences', () => {
    const stack = new CommandStack(page);
    stack.execute(new UpdateBlockCommand('sec_hero', 'blk_a', { label: 'New' }));
    const result = stack.undo();

    expect(blockPreferences(result).label).toBe('Old');
  });

  it('throws when the section does not support blocks', () => {
    const stack = new CommandStack(page);
    expect(() => stack.execute(new UpdateBlockCommand('sec_grid', 'blk_a', { label: 'x' }))).toThrow(
      'does not support blocks',
    );
  });

  it('throws for a block id that does not exist', () => {
    const stack = new CommandStack(page);
    expect(() => stack.execute(new UpdateBlockCommand('sec_hero', 'nope', { label: 'x' }))).toThrow(
      'Block "nope" not found',
    );
  });
});
