'use client';

import { registerSection } from '@editor/renderer';
import type { RenderMode } from '@editor/renderer';
import type { ReactNode } from 'react';

// Placeholder section components for the canvas/preview demo — `packages/component-library`
// (the real Hero/RichText/etc.) does not exist yet. Registration runs once, as a module-level
// side effect, when this file is first imported by a Client Component — matching the registry
// instance the browser's copy of `@editor/renderer` reads from.
//
// Each placeholder honors `mode`: the "🚧 placeholder" hint is hidden in `live` mode, so the
// preview shows a cleaner approximation of the published page (demonstrates the edit/live split).

const contentStyle = {
  border: '1px dashed #bbb',
  padding: 16,
  color: '#333',
  background: '#fafafa',
} as const;

const commerceStyle = {
  border: '1px dashed #c88',
  padding: 16,
  color: '#333',
  background: '#fdf6f6',
} as const;

function Hint({ mode, children }: { mode: RenderMode; children: ReactNode }) {
  if (mode === 'live') return null;
  return <small style={{ color: '#999' }}>{children}</small>;
}

registerSection('hero', ({ section, mode }) => {
  if (section.type !== 'hero') return null;
  return (
    <div style={contentStyle}>
      <h2 style={{ margin: '0 0 4px' }}>{section.preferences.heading || '(brak nagłówka)'}</h2>
      <p style={{ margin: 0 }}>{section.preferences.subheading}</p>
      <Hint mode={mode}>🚧 placeholder Hero</Hint>
    </div>
  );
});

registerSection('rich_text', ({ section, mode }) => {
  if (section.type !== 'rich_text') return null;
  return (
    <div style={contentStyle}>
      {/* eslint-disable-next-line react/no-danger -- demo placeholder, content is our own seed/edited data */}
      <div dangerouslySetInnerHTML={{ __html: section.preferences.html }} />
      <Hint mode={mode}>🚧 placeholder RichText</Hint>
    </div>
  );
});

registerSection('newsletter', ({ section, mode }) => {
  if (section.type !== 'newsletter') return null;
  return (
    <div style={contentStyle}>
      <strong>{section.preferences.heading}</strong>
      {section.preferences.subheading ? <p style={{ margin: '4px 0' }}>{section.preferences.subheading}</p> : null}
      <div>
        <button type="button" disabled>
          {section.preferences.buttonLabel}
        </button>
      </div>
      <Hint mode={mode}>🚧 placeholder Newsletter</Hint>
    </div>
  );
});

registerSection('image_banner', ({ section, mode }) => {
  if (section.type !== 'image_banner') return null;
  return (
    <div
      style={{
        ...contentStyle,
        minHeight: Math.min(section.preferences.heightPx, 160),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span>🖼️ Baner z obrazem ({section.preferences.heightPx}px)</span>
      <Hint mode={mode}>🚧 placeholder ImageBanner</Hint>
    </div>
  );
});

registerSection('faq', ({ section, mode }) => {
  if (section.type !== 'faq') return null;
  return (
    <div style={contentStyle}>
      <strong>{section.preferences.heading}</strong>
      <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
        {section.preferences.items.length === 0 ? (
          <li style={{ color: '#999' }}>(brak pytań)</li>
        ) : (
          section.preferences.items.map((item, i) => <li key={i}>{item.question}</li>)
        )}
      </ul>
      <Hint mode={mode}>🚧 placeholder FAQ</Hint>
    </div>
  );
});

registerSection('spacer', ({ section, mode }) => {
  if (section.type !== 'spacer') return null;
  return (
    <div style={{ height: section.preferences.heightPx, background: mode === 'live' ? 'transparent' : '#f0f0f0' }}>
      <Hint mode={mode}>🚧 spacer {section.preferences.heightPx}px</Hint>
    </div>
  );
});

registerSection('button', ({ section, mode }) => {
  if (section.type !== 'button') return null;
  return (
    <div style={contentStyle}>
      <a
        href={section.preferences.href}
        onClick={(e) => e.preventDefault()}
        style={{ display: 'inline-block', padding: '8px 16px', background: '#222', color: '#fff', borderRadius: 4, textDecoration: 'none' }}
      >
        {section.preferences.label}
      </a>
      <Hint mode={mode}>🚧 placeholder Button</Hint>
    </div>
  );
});

// Commerce section: in a real storefront this is registered by the host with a data-backed
// implementation (see docs/ARCHITEKTURA.md "Podział sekcji: treść vs commerce"). Here it's a
// static editor-side placeholder, styled distinctly to make the content/commerce split visible.
registerSection('product_grid', ({ section, mode }) => {
  if (section.type !== 'product_grid') return null;
  return (
    <div style={commerceStyle}>
      <strong>{section.preferences.heading}</strong>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(section.preferences.limit, 4)}, 1fr)`, gap: 8, marginTop: 8 }}>
        {Array.from({ length: Math.min(section.preferences.limit, 4) }).map((_, i) => (
          <div key={i} style={{ aspectRatio: '1', background: '#eee', borderRadius: 4 }} />
        ))}
      </div>
      <Hint mode={mode}>🛒 sekcja commerce — storefront dostarcza realną implementację</Hint>
    </div>
  );
});
