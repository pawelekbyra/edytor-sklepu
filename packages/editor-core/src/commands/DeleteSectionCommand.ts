import { type Page, PageSchema, type Section } from '@editor/schema';
import type { Command } from '../Command.js';

// Removes a section and renumbers positions; undo reinserts it at its original index
// (docs/MACIERZ_ZGODNOSCI.md section 5, "Usuń sekcję").
export class DeleteSectionCommand implements Command<Page> {
  private removed: Section | undefined;
  private removedIndex = -1;

  constructor(private readonly sectionId: string) {}

  do(state: Page): Page {
    const sections = [...state.sections].sort((a, b) => a.position - b.position);
    const index = sections.findIndex((section) => section.id === this.sectionId);
    if (index === -1) throw new Error(`Section "${this.sectionId}" not found`);

    this.removed = sections[index];
    this.removedIndex = index;
    sections.splice(index, 1);

    return PageSchema.parse({
      ...state,
      sections: sections.map((section, position) => ({ ...section, position })),
    });
  }

  undo(state: Page): Page {
    if (!this.removed) throw new Error('Cannot undo before do() has run');
    const sections = [...state.sections].sort((a, b) => a.position - b.position);
    sections.splice(this.removedIndex, 0, this.removed);
    return PageSchema.parse({
      ...state,
      sections: sections.map((section, position) => ({ ...section, position })),
    });
  }
}
