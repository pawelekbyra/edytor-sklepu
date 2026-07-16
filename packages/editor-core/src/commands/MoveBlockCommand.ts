import { type Page, PageSchema } from '@editor/schema';
import type { Command } from '../Command.js';

// Same reorder primitive as MoveSectionCommand, one level down: blocks nested inside a section
// (docs/MACIERZ_ZGODNOSCI.md section 1, "Analogicznie dla bloków").
export class MoveBlockCommand implements Command<Page> {
  private fromIndex = -1;

  constructor(
    private readonly sectionId: string,
    private readonly blockId: string,
    private readonly toIndex: number,
  ) {}

  do(state: Page): Page {
    return this.moveTo(state, this.toIndex, true);
  }

  undo(state: Page): Page {
    return this.moveTo(state, this.fromIndex, false);
  }

  private moveTo(state: Page, targetIndex: number, recordFromIndex: boolean): Page {
    const sections = state.sections.map((section) => {
      if (section.id !== this.sectionId) return section;
      if (!('blocks' in section)) {
        throw new Error(`Section "${this.sectionId}" (type "${section.type}") does not support blocks`);
      }

      const blocks = [...section.blocks].sort((a, b) => a.position - b.position);
      const fromIndex = blocks.findIndex((block) => block.id === this.blockId);
      if (fromIndex === -1) throw new Error(`Block "${this.blockId}" not found`);
      if (recordFromIndex) this.fromIndex = fromIndex;

      const [moved] = blocks.splice(fromIndex, 1);
      blocks.splice(targetIndex, 0, moved);

      return { ...section, blocks: blocks.map((block, index) => ({ ...block, position: index })) };
    });

    return PageSchema.parse({ ...state, sections });
  }
}
