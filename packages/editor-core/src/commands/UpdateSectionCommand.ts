import { type Page, PageSchema } from '@editor/schema';
import type { Command } from '../Command.js';

// Merges a partial preferences patch into a section's preferences — the primitive behind the
// property panel (docs/MACIERZ_ZGODNOSCI.md section 5, "Edytuj sekcję").
export class UpdateSectionCommand implements Command<Page> {
  private previousPreferences: Record<string, unknown> | undefined;

  constructor(
    private readonly sectionId: string,
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
    const sectionIndex = state.sections.findIndex((section) => section.id === this.sectionId);
    if (sectionIndex === -1) throw new Error(`Section "${this.sectionId}" not found`);

    const sections = [...state.sections];
    const target = sections[sectionIndex];
    if (recordPrevious) this.previousPreferences = target.preferences;

    sections[sectionIndex] = {
      ...target,
      preferences: recordPrevious ? { ...target.preferences, ...preferences } : preferences,
    } as (typeof sections)[number];

    return PageSchema.parse({ ...state, sections });
  }
}
