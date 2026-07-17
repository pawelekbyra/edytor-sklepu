import { type Page, PageSchema } from '@pawelekbyra/schema';
import type { Command } from '../Command.js';

// Same merge-patch primitive as UpdateSectionCommand, one level down for a block nested inside a
// section (docs/MACIERZ_ZGODNOSCI.md section 5, "Analogicznie dla bloków").
export class UpdateBlockCommand implements Command<Page> {
  private previousPreferences: Record<string, unknown> | undefined;

  constructor(
    private readonly sectionId: string,
    private readonly blockId: string,
    private readonly preferences: Record<string, unknown>,
  ) {}

  do(state: Page): Page {
    return this.apply(state, this.preferences, true);
  }

  undo(state: Page): Page {
    if (!this.previousPreferences) throw new Error('Cannot undo before do() has run');
    return this.apply(state, this.previousPreferences, false);
  }

  private apply(state: Page, preferences: Record<string, unknown>, recordPrevious: boolean): Page {
    const sections = state.sections.map((section) => {
      if (section.id !== this.sectionId) return section;
      if (!('blocks' in section)) {
        throw new Error(`Section "${this.sectionId}" (type "${section.type}") does not support blocks`);
      }

      const blockIndex = section.blocks.findIndex((block) => block.id === this.blockId);
      if (blockIndex === -1) throw new Error(`Block "${this.blockId}" not found`);

      const blocks = [...section.blocks];
      const target = blocks[blockIndex];
      if (recordPrevious) this.previousPreferences = target.preferences;

      blocks[blockIndex] = {
        ...target,
        preferences: recordPrevious ? { ...target.preferences, ...preferences } : preferences,
      } as (typeof blocks)[number];

      return { ...section, blocks };
    });

    return PageSchema.parse({ ...state, sections });
  }
}
