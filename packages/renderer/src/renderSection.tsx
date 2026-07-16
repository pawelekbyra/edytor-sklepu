import { createElement, type ReactElement } from 'react';
import type { Section } from '@editor/schema';
import { SectionErrorBoundary } from './ErrorBoundary.js';
import { getSectionComponent } from './registry.js';
import type { RenderMode } from './types.js';

export interface RenderSectionOptions {
  mode: RenderMode;
}

export function renderSection(section: Section, { mode }: RenderSectionOptions): ReactElement {
  const SectionComponent = getSectionComponent(section.type);

  if (!SectionComponent) {
    // A missing registry entry must not crash the page (docs/MACIERZ_ZGODNOSCI.md section 6,
    // "Konwersja type → component") — e.g. a page authored against a newer component-library
    // version than the one currently deployed.
    return createElement(
      'div',
      { key: section.id, 'data-section-fallback': section.type },
      `Unknown section type: "${section.type}"`,
    );
  }

  return createElement(
    SectionErrorBoundary,
    {
      key: section.id,
      fallback: createElement(
        'div',
        { 'data-section-error': section.type },
        `Section "${section.type}" failed to render`,
      ),
    },
    createElement(
      'div',
      { 'data-section': section.type, 'data-mode': mode },
      createElement(SectionComponent, { section, mode }),
    ),
  );
}
