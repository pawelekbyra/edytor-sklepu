import { SectionSchema } from '@pawelekbyra/schema';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ButtonSection } from '../src/sections/ButtonSection.js';
import { Faq } from '../src/sections/Faq.js';
import { Hero } from '../src/sections/Hero.js';
import { Newsletter } from '../src/sections/Newsletter.js';
import { RichText } from '../src/sections/RichText.js';

// Vitest isn't configured with `globals`, so Testing Library can't auto-register its afterEach
// cleanup — without this, renders accumulate in document.body and getByText finds duplicates
// across tests.
afterEach(cleanup);

function section(input: unknown) {
  return SectionSchema.parse(input);
}

describe('Hero', () => {
  it('renders heading and subheading', () => {
    const s = section({ id: 's', type: 'hero', position: 0, preferences: { heading: 'Kakao', subheading: 'Najlepsze' } });
    render(<Hero section={s} mode="live" />);
    expect(screen.getByText('Kakao')).toBeTruthy();
    expect(screen.getByText('Najlepsze')).toBeTruthy();
  });

  it('renders nothing for a section of another type (registry mis-wiring guard)', () => {
    const s = section({ id: 's', type: 'spacer', position: 0, preferences: {} });
    const { container } = render(<Hero section={s} mode="live" />);
    expect(container.firstChild).toBeNull();
  });
});

describe('RichText', () => {
  it('renders author HTML as markup', () => {
    const s = section({ id: 's', type: 'rich_text', position: 0, preferences: { html: '<p>Witaj <strong>tam</strong></p>' } });
    render(<RichText section={s} mode="live" />);
    expect(screen.getByText('tam').tagName).toBe('STRONG');
  });
});

describe('Faq', () => {
  it('renders each question/answer pair', () => {
    const s = section({
      id: 's',
      type: 'faq',
      position: 0,
      preferences: { heading: 'FAQ', items: [{ question: 'Czy kakao?', answer: 'Tak' }] },
    });
    render(<Faq section={s} mode="live" />);
    expect(screen.getByText('Czy kakao?')).toBeTruthy();
    expect(screen.getByText('Tak')).toBeTruthy();
  });
});

// The edit/live distinction is the foundation of "preview == published page": the same component
// must render the same content in both, differing only in interactivity.
describe('mode: edit vs live', () => {
  const buttonSection = section({
    id: 's',
    type: 'button',
    position: 0,
    preferences: { label: 'Kup teraz', href: '/kup' },
  });

  it('ButtonSection is a real link in live mode', () => {
    render(<ButtonSection section={buttonSection} mode="live" />);
    const link = screen.getByText('Kup teraz');
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('/kup');
  });

  it('ButtonSection is inert (not a link) in edit mode, but shows the same label', () => {
    render(<ButtonSection section={buttonSection} mode="edit" />);
    const el = screen.getByText('Kup teraz');
    expect(el.tagName).toBe('SPAN');
  });

  it('Newsletter submit is enabled only in live mode', () => {
    const s = section({ id: 's', type: 'newsletter', position: 0, preferences: { heading: 'News', buttonLabel: 'Zapisz' } });

    const live = render(<Newsletter section={s} mode="live" />);
    expect(live.getByRole('button', { name: 'Zapisz' }).hasAttribute('disabled')).toBe(false);
    live.unmount();

    render(<Newsletter section={s} mode="edit" />);
    expect(screen.getByRole('button', { name: 'Zapisz' }).hasAttribute('disabled')).toBe(true);
  });
});
