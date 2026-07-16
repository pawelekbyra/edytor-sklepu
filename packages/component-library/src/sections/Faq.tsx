import { sectionStyles } from '@editor/renderer';
import type { RenderMode } from '@editor/renderer';
import type { Section } from '@editor/schema';

export function Faq({ section }: { section: Section; mode: RenderMode }) {
  if (section.type !== 'faq') return null;
  const { heading, items } = section.preferences;

  return (
    <section style={sectionStyles(section.style)}>
      {heading ? <h2 style={{ margin: '0 0 8px', fontSize: 22 }}>{heading}</h2> : null}
      {items.map((item) => (
        // `details` gives working expand/collapse with no client JS — keeps this a server component.
        <details key={item.question} style={{ borderBottom: '1px solid #eee', padding: '6px 0' }}>
          <summary style={{ cursor: 'pointer' }}>{item.question}</summary>
          <p style={{ margin: '6px 0 0', opacity: 0.85 }}>{item.answer}</p>
        </details>
      ))}
    </section>
  );
}
