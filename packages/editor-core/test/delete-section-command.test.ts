import { PageSchema } from '@pawelekbyra/schema';
import { describe, expect, it } from 'vitest';
import { CommandStack } from '../src/CommandStack.js';
import { DeleteSectionCommand } from '../src/commands/DeleteSectionCommand.js';

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

function order(p: typeof page): string[] {
  return [...p.sections].sort((a, b) => a.position - b.position).map((s) => s.id);
}

describe('DeleteSectionCommand', () => {
  it('removes a section and renumbers positions contiguously', () => {
    const stack = new CommandStack(page);
    const result = stack.execute(new DeleteSectionCommand('sec_b'));

    expect(order(result)).toEqual(['sec_a', 'sec_c']);
    expect(result.sections.map((s) => s.position).sort()).toEqual([0, 1]);
  });

  it('undo restores the section at its original index', () => {
    const stack = new CommandStack(page);
    stack.execute(new DeleteSectionCommand('sec_b'));
    const result = stack.undo();
    expect(order(result)).toEqual(['sec_a', 'sec_b', 'sec_c']);
  });

  it('throws for a section id that does not exist', () => {
    const stack = new CommandStack(page);
    expect(() => stack.execute(new DeleteSectionCommand('nope'))).toThrow('Section "nope" not found');
  });
});
