import { PageSchema } from '@pawelekbyra/schema';
import { describe, expect, it } from 'vitest';
import { CommandStack } from '../src/CommandStack.js';
import { MoveSectionCommand } from '../src/commands/MoveSectionCommand.js';

const page = PageSchema.parse({
  id: 'page_1',
  storeId: 'store_1',
  themeId: 'theme_1',
  type: 'homepage',
  name: 'Homepage',
  sections: [
    { id: 'sec_a', type: 'hero', position: 0, preferences: {} },
    { id: 'sec_b', type: 'rich_text', position: 1, preferences: {} },
    { id: 'sec_c', type: 'newsletter', position: 2, preferences: {} },
  ],
});

function orderOf(p: typeof page): string[] {
  return [...p.sections].sort((a, b) => a.position - b.position).map((s) => s.id);
}

describe('MoveSectionCommand', () => {
  it('moves a section to a new index and reassigns contiguous positions', () => {
    const stack = new CommandStack(page);
    const result = stack.execute(new MoveSectionCommand('sec_c', 0));

    expect(orderOf(result)).toEqual(['sec_c', 'sec_a', 'sec_b']);
    expect(result.sections.map((s) => s.position).sort()).toEqual([0, 1, 2]);
  });

  it('undo restores the original order', () => {
    const stack = new CommandStack(page);
    stack.execute(new MoveSectionCommand('sec_c', 0));
    const result = stack.undo();

    expect(orderOf(result)).toEqual(['sec_a', 'sec_b', 'sec_c']);
  });

  it('redo re-applies the move', () => {
    const stack = new CommandStack(page);
    stack.execute(new MoveSectionCommand('sec_c', 0));
    stack.undo();
    const result = stack.redo();

    expect(orderOf(result)).toEqual(['sec_c', 'sec_a', 'sec_b']);
  });

  it('throws for a section id that does not exist', () => {
    const stack = new CommandStack(page);
    expect(() => stack.execute(new MoveSectionCommand('nope', 0))).toThrow('Section "nope" not found');
  });
});
