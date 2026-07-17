import { sectionStyles } from '@pawelekbyra/renderer';
import type { RenderMode } from '@pawelekbyra/renderer';
import type { Section } from '@pawelekbyra/schema';

const buttonLook = {
  display: 'inline-block',
  padding: '8px 16px',
  background: '#222',
  color: '#fff',
  borderRadius: 4,
  textDecoration: 'none',
} as const;

export function ButtonSection({ section, mode }: { section: Section; mode: RenderMode }) {
  if (section.type !== 'button') return null;
  const { label, href, openInNewTab } = section.preferences;

  return (
    <section style={{ ...sectionStyles(section.style), textAlign: 'center' }}>
      {mode === 'live' ? (
        <a href={href} target={openInNewTab ? '_blank' : undefined} rel={openInNewTab ? 'noreferrer' : undefined} style={buttonLook}>
          {label}
        </a>
      ) : (
        // On the canvas a real link would navigate away mid-edit; render the same look as an inert
        // span instead (keeps this a server component — no click handler needed to block it).
        <span style={buttonLook}>{label}</span>
      )}
    </section>
  );
}
