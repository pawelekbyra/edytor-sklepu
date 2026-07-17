import { type Page, PageSchema } from '@pawelekbyra/schema';
import type { Command } from '../Command.js';

// Reorders `page.sections` and reassigns `position` for every section so it stays contiguous —
// the drag&drop primitive behind the canvas (docs/MACIERZ_ZGODNOSCI.md section 1, "Reorder sekcji").
export class MoveSectionCommand implements Command<Page> {
  private fromIndex = -1;

  constructor(
    private readonly sectionId: string,
    private readonly toIndex: number,
  ) {}

  do(state: Page): Page {
    return this.moveTo(state, this.toIndex, true);
  }

  undo(state: Page): Page {
    return this.moveTo(state, this.fromIndex, false);
  }

  private moveTo(state: Page, targetIndex: number, recordFromIndex: boolean): Page {
    const sections = [...state.sections].sort((a, b) => a.position - b.position);
    const fromIndex = sections.findIndex((section) => section.id === this.sectionId);
    if (fromIndex === -1) throw new Error(`Section "${this.sectionId}" not found`);
    if (recordFromIndex) this.fromIndex = fromIndex;

    const [moved] = sections.splice(fromIndex, 1);
    sections.splice(targetIndex, 0, moved);

    return PageSchema.parse({
      ...state,
      sections: sections.map((section, index) => ({ ...section, position: index })),
    });
  }
}
