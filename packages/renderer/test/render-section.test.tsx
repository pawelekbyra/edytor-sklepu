import { SectionSchema } from '@pawelekbyra/schema';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { registerSection, resetRegistry } from '../src/registry.js';
import { renderSection } from '../src/renderSection.js';

describe('renderSection', () => {
  afterEach(() => {
    resetRegistry();
  });

  it('renders the registered component for the section type, passing section + mode', () => {
    registerSection('hero', ({ section, mode }) => (
      <div>
        {section.type === 'hero' ? section.preferences.heading : ''} / {mode}
      </div>
    ));

    const section = SectionSchema.parse({
      id: 'sec_1',
      type: 'hero',
      position: 0,
      preferences: { heading: 'Welcome' },
    });

    render(renderSection(section, { mode: 'live' }));
    expect(screen.getByText('Welcome / live')).toBeTruthy();
  });

  it('renders a readable fallback for an unregistered section type instead of crashing', () => {
    const section = SectionSchema.parse({ id: 'sec_1', type: 'hero', position: 0, preferences: {} });

    render(renderSection(section, { mode: 'live' }));
    expect(screen.getByText('Unknown section type: "hero"')).toBeTruthy();
  });

  it('catches a throwing section component and renders the fallback instead of crashing the page', () => {
    registerSection('hero', () => {
      throw new Error('boom');
    });
    const section = SectionSchema.parse({ id: 'sec_1', type: 'hero', position: 0, preferences: {} });

    render(renderSection(section, { mode: 'live' }));
    expect(screen.getByText('Section "hero" failed to render')).toBeTruthy();
  });
});
