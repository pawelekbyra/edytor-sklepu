import { type Section, SectionSchema, type SectionType } from '@editor/schema';

// Sensible starter preferences per type — most sections validate with `{}` (schema defaults fill
// in), but a few have required fields with no default (button, video) that must be seeded here.
const STARTER_PREFERENCES: Partial<Record<SectionType, Record<string, unknown>>> = {
  hero: { heading: 'Nowy nagłówek', subheading: 'Podtytuł' },
  rich_text: { html: '<p>Nowy tekst — kliknij, aby edytować.</p>' },
  newsletter: { heading: 'Zapisz się na newsletter', buttonLabel: 'Subskrybuj' },
  image_banner: {},
  faq: { heading: 'Najczęstsze pytania' },
  spacer: {},
  button: { label: 'Kliknij mnie', href: '#' },
  product_grid: { heading: 'Polecane produkty' },
};

// The content sections offered in the "add section" palette (commerce shown too, as a placeholder,
// to make the content-vs-commerce split visible — see docs/ARCHITEKTURA.md).
export const ADDABLE_SECTION_TYPES: readonly SectionType[] = [
  'hero',
  'rich_text',
  'newsletter',
  'image_banner',
  'faq',
  'spacer',
  'button',
  'product_grid',
];

let counter = 0;
function nextId(): string {
  counter += 1;
  return `sec_${Date.now().toString(36)}_${counter}`;
}

export function createSection(type: SectionType): Section {
  return SectionSchema.parse({
    id: nextId(),
    type,
    position: 0, // AddSectionCommand renumbers on insert
    preferences: STARTER_PREFERENCES[type] ?? {},
  });
}
