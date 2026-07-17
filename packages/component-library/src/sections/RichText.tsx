import { sectionStyles } from '@pawelekbyra/renderer';
import type { RenderMode, } from '@pawelekbyra/renderer';
import type { Section } from '@pawelekbyra/schema';

// `html` comes from the editor's rich-text field. It is author-controlled content, rendered as
// HTML by design — the same trust model as the Rails page builder's ActionText body. Sanitization
// belongs at the write/API boundary (a real backend must not accept arbitrary author HTML from an
// untrusted role), not here, where escaping it would defeat the section's purpose.
export function RichText({ section }: { section: Section; mode: RenderMode }) {
  if (section.type !== 'rich_text') return null;

  return (
    <section style={sectionStyles(section.style)}>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: author-authored rich text, see note above */}
      <div dangerouslySetInnerHTML={{ __html: section.preferences.html }} />
    </section>
  );
}
