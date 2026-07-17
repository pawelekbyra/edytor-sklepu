import { type Page, PageSchema, type Section } from '@pawelekbyra/schema';
import type { Command } from '../Command.js';

// Inserts an already-validated section at a given index and renumbers positions contiguously.
// The section is built by the caller (the app has a factory that knows sane defaults per type,
// including types with required preference fields like button/video) — keeping this command a
// pure structural insert (docs/MACIERZ_ZGODNOSCI.md section 5, "Dodaj sekcję").
export class AddSectionCommand implements Command<Page> {
  constructor(
    private readonly section: Section,
    private readonly atIndex: number,
  ) {}

  do(state: Page): Page {
    const sections = [...state.sections].sort((a, b) => a.position - b.position);
    const clampedIndex = Math.max(0, Math.min(this.atIndex, sections.length));
    sections.splice(clampedIndex, 0, this.section);
    return PageSchema.parse({
      ...state,
      sections: sections.map((section, index) => ({ ...section, position: index })),
    });
  }

  undo(state: Page): Page {
    const sections = [...state.sections]
      .sort((a, b) => a.position - b.position)
      .filter((section) => section.id !== this.section.id);
    return PageSchema.parse({
      ...state,
      sections: sections.map((section, index) => ({ ...section, position: index })),
    });
  }
}
