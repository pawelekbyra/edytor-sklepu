import { PageSchema, SectionSchema } from '@pawelekbyra/schema';
import { describe, expect, it } from 'vitest';
import { CommandStack } from '../src/CommandStack.js';
import { AddSectionCommand } from '../src/commands/AddSectionCommand.js';

const page = PageSchema.parse({
  id: 'page_1',
  storeId: 'store_1',
  themeId: 'theme_1',
  type: 'homepage',
  name: 'Homepage',
  sections: [
    { id: 'sec_a', type: 'hero', position: 0, preferences: {} },
    { id: 'sec_b', type: 'newsletter', position: 1, preferences: {} },
  ],
});

const newSection = SectionSchema.parse({ id: 'sec_new', type: 'rich_text', position: 0, preferences: {} });

function order(p: typeof page): string[] {
  return [...p.sections].sort((a, b) => a.position - b.position).map((s) => s.id);
}

describe('AddSectionCommand', () => {
  it('inserts a section at the given index and renumbers positions', () => {
    const stack = new CommandStack(page);
    const result = stack.execute(new AddSectionCommand(newSection, 1));

    expect(order(result)).toEqual(['sec_a', 'sec_new', 'sec_b']);
    expect(result.sections.map((s) => s.position).sort()).toEqual([0, 1, 2]);
  });

  it('clamps an out-of-range index to the end', () => {
    const stack = new CommandStack(page);
    const result = stack.execute(new AddSectionCommand(newSection, 99));
    expect(order(result)).toEqual(['sec_a', 'sec_b', 'sec_new']);
  });

  it('undo removes the inserted section', () => {
    const stack = new CommandStack(page);
    stack.execute(new AddSectionCommand(newSection, 1));
    const result = stack.undo();
    expect(order(result)).toEqual(['sec_a', 'sec_b']);
  });

  it('redo re-inserts it', () => {
    const stack = new CommandStack(page);
    stack.execute(new AddSectionCommand(newSection, 0));
    stack.undo();
    const result = stack.redo();
    expect(order(result)).toEqual(['sec_new', 'sec_a', 'sec_b']);
  });
});
