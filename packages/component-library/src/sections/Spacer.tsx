import type { RenderMode } from '@pawelekbyra/renderer';
import type { Section } from '@pawelekbyra/schema';

export function Spacer({ section, mode }: { section: Section; mode: RenderMode }) {
  if (section.type !== 'spacer') return null;

  return (
    <div
      style={{
        height: section.preferences.heightPx,
        // Invisible on the published page; faintly shaded on the canvas so authors can see and
        // grab an otherwise-empty section.
        background: mode === 'live' ? undefined : 'repeating-linear-gradient(45deg,#f6f6f6,#f6f6f6 6px,#efefef 6px,#efefef 12px)',
      }}
    />
  );
}
