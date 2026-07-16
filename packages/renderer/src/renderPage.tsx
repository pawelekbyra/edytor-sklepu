import { createElement, Fragment, type ReactElement } from 'react';
import type { Page } from '@editor/schema';
import { renderSection } from './renderSection.js';
import type { RenderMode } from './types.js';

export interface RenderPageOptions {
  mode: RenderMode;
}

export function renderPage(page: Page, { mode }: RenderPageOptions): ReactElement {
  const orderedSections = [...page.sections].sort((a, b) => a.position - b.position);
  return createElement(
    Fragment,
    null,
    orderedSections.map((section) => renderSection(section, { mode })),
  );
}
