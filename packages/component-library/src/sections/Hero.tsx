import { sectionStyles } from '@editor/renderer';
import type { Section } from '@editor/schema';
import type { RenderMode } from '@editor/renderer';

export function Hero({ section }: { section: Section; mode: RenderMode }) {
  if (section.type !== 'hero') return null;
  const { heading, subheading } = section.preferences;

  return (
    <section style={{ ...sectionStyles(section.style), textAlign: 'center' }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 32 }}>{heading}</h1>
      {subheading ? <p style={{ margin: 0, fontSize: 18, opacity: 0.8 }}>{subheading}</p> : null}
    </section>
  );
}
