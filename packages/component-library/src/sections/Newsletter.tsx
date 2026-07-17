import { sectionStyles } from '@pawelekbyra/renderer';
import type { RenderMode } from '@pawelekbyra/renderer';
import type { Section } from '@pawelekbyra/schema';

export function Newsletter({ section, mode }: { section: Section; mode: RenderMode }) {
  if (section.type !== 'newsletter') return null;
  const { heading, subheading, buttonLabel } = section.preferences;

  return (
    <section style={{ ...sectionStyles(section.style), textAlign: 'center' }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 22 }}>{heading}</h2>
      {subheading ? <p style={{ margin: '0 0 8px', opacity: 0.8 }}>{subheading}</p> : null}
      <form
        // In `edit` mode the canvas is not a live page — submitting would be meaningless, so the
        // form is inert. A real storefront wires this to its own newsletter endpoint.
        action={mode === 'live' ? '/newsletter' : undefined}
        style={{ display: 'flex', gap: 8, justifyContent: 'center' }}
      >
        <input type="email" placeholder="twój@email.pl" readOnly={mode !== 'live'} style={{ padding: '6px 8px' }} />
        <button type="submit" disabled={mode !== 'live'} style={{ padding: '6px 12px' }}>
          {buttonLabel}
        </button>
      </form>
    </section>
  );
}
