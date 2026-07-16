import { sectionStyles } from '@editor/renderer';
import type { RenderMode } from '@editor/renderer';
import type { Section } from '@editor/schema';

const ALIGNMENT_TO_ITEMS = { top: 'flex-start', middle: 'center', bottom: 'flex-end' } as const;

export function ImageBanner({ section }: { section: Section; mode: RenderMode }) {
  if (section.type !== 'image_banner') return null;
  const { imageAssetId, heightPx, overlayTransparency, verticalAlignment } = section.preferences;

  return (
    <section
      style={{
        ...sectionStyles(section.style),
        position: 'relative',
        height: heightPx,
        display: 'flex',
        alignItems: ALIGNMENT_TO_ITEMS[verticalAlignment],
        justifyContent: 'center',
        // MediaRepository resolves assetId -> URL; until an asset is picked, show a neutral panel.
        background: imageAssetId ? undefined : '#e9e9e9',
        overflow: 'hidden',
      }}
    >
      <div
        style={{ position: 'absolute', inset: 0, background: '#000', opacity: overlayTransparency / 100 }}
        aria-hidden="true"
      />
      <div style={{ position: 'relative', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.6)' }}>
        {imageAssetId ? null : <span style={{ color: '#666', textShadow: 'none' }}>Wybierz obraz</span>}
      </div>
    </section>
  );
}
