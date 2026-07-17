import { PageSchema } from '@pawelekbyra/schema';
import { describe, expect, it } from 'vitest';
import { CommandStack } from '../src/CommandStack.js';
import { UpdateSectionCommand } from '../src/commands/UpdateSectionCommand.js';

const page = PageSchema.parse({
  id: 'page_1',
  storeId: 'store_1',
  themeId: 'theme_1',
  type: 'homepage',
  name: 'Homepage',
  sections: [{ id: 'sec_hero', type: 'hero', position: 0, preferences: { heading: 'Old', subheading: 'Sub' } }],
});

function heroPreferences(p: typeof page) {
  const hero = p.sections.find((s) => s.id === 'sec_hero');
  if (!hero || hero.type !== 'hero') throw new Error('expected hero');
  return hero.preferences;
}

describe('UpdateSectionCommand', () => {
  it('merges a patch into existing preferences', () => {
    const stack = new CommandStack(page);
    const result = stack.execute(new UpdateSectionCommand('sec_hero', { heading: 'New' }));

    expect(heroPreferences(result).heading).toBe('New');
    expect(heroPreferences(result).subheading).toBe('Sub');
  });

  it('undo restores the exact previous preferences', () => {
    const stack = new CommandStack(page);
    stack.execute(new UpdateSectionCommand('sec_hero', { heading: 'New' }));
    const result = stack.undo();

    expect(heroPreferences(result).heading).toBe('Old');
    expect(heroPreferences(result).subheading).toBe('Sub');
  });

  it('redo re-applies the patch', () => {
    const stack = new CommandStack(page);
    stack.execute(new UpdateSectionCommand('sec_hero', { heading: 'New' }));
    stack.undo();
    const result = stack.redo();

    expect(heroPreferences(result).heading).toBe('New');
  });

  it('throws for a section id that does not exist', () => {
    const stack = new CommandStack(page);
    expect(() => stack.execute(new UpdateSectionCommand('nope', { heading: 'x' }))).toThrow(
      'Section "nope" not found',
    );
  });

  it('rejects a patch that violates the schema for this section type', () => {
    const stack = new CommandStack(page);
    expect(() => stack.execute(new UpdateSectionCommand('sec_hero', { heading: 123 }))).toThrow();
  });
});
