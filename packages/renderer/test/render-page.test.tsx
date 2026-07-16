import { PageSchema } from '@editor/schema';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { registerSection, resetRegistry } from '../src/registry.js';
import { renderPage } from '../src/renderPage.js';

describe('renderPage', () => {
  afterEach(() => {
    resetRegistry();
  });

  it('renders sections in position order, not declaration order', () => {
    registerSection('hero', ({ section }) => (
      <div>{section.type === 'hero' ? section.preferences.heading : ''}</div>
    ));

    const page = PageSchema.parse({
      id: 'page_1',
      storeId: 'store_1',
      themeId: 'theme_1',
      type: 'homepage',
      name: 'Homepage',
      sections: [
        { id: 'sec_2', type: 'hero', position: 1, preferences: { heading: 'Second' } },
        { id: 'sec_1', type: 'hero', position: 0, preferences: { heading: 'First' } },
      ],
    });

    render(renderPage(page, { mode: 'live' }));

    const headings = screen.getAllByText(/First|Second/).map((el) => el.textContent);
    expect(headings).toEqual(['First', 'Second']);
  });

  it('renders a page with no sections without throwing', () => {
    const page = PageSchema.parse({
      id: 'page_1',
      storeId: 'store_1',
      themeId: 'theme_1',
      type: 'custom',
      name: 'Blank',
    });

    expect(() => render(renderPage(page, { mode: 'live' }))).not.toThrow();
  });
});
