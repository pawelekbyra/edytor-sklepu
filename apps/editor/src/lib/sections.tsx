'use client';

import { registerSection } from '@editor/renderer';

// Placeholder section components for the Etap 6 canvas demo — `packages/component-library`
// (the real Hero/RichText/Newsletter/etc.) does not exist yet. Registration runs once, as a
// module-level side effect, when this file is first imported by a Client Component — matching the
// registry instance the browser's copy of `@editor/renderer` actually reads from.
const placeholderStyle = {
  border: '1px dashed #999',
  padding: 16,
  color: '#555',
  background: '#fafafa',
} as const;

registerSection('hero', ({ section }) => {
  if (section.type !== 'hero') return null;
  return (
    <div style={placeholderStyle}>
      <strong>{section.preferences.heading || '(brak nagłówka)'}</strong>
      <p>{section.preferences.subheading}</p>
      <small>🚧 placeholder sekcji Hero — component-library jeszcze nie istnieje</small>
    </div>
  );
});

registerSection('rich_text', ({ section }) => {
  if (section.type !== 'rich_text') return null;
  return (
    <div style={placeholderStyle}>
      {/* eslint-disable-next-line react/no-danger -- demo placeholder only, content is our own seed data */}
      <div dangerouslySetInnerHTML={{ __html: section.preferences.html }} />
      <small>🚧 placeholder sekcji RichText</small>
    </div>
  );
});

registerSection('newsletter', ({ section }) => {
  if (section.type !== 'newsletter') return null;
  return (
    <div style={placeholderStyle}>
      <strong>{section.preferences.heading}</strong>
      <div>
        <button type="button" disabled>
          {section.preferences.buttonLabel}
        </button>
      </div>
      <small>🚧 placeholder sekcji Newsletter</small>
    </div>
  );
});
