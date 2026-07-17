'use client';

import { registerContentSections } from '@pawelekbyra/component-library';
import { registerSection } from '@pawelekbyra/renderer';

// Content sections come from the shared library — the same components the storefront registers,
// which is what makes the editor's preview match the published page.
registerContentSections();

// Commerce sections are the host's job: they need a data layer (Store API) that belongs to the
// storefront, not to a presentational library (docs/ARCHITEKTURA.md, "Podział sekcji: treść vs
// commerce"). The editor has no storefront data layer, so it registers a static preview instead —
// same `component_key`, different implementation per runtime.
registerSection('product_grid', ({ section, mode }) => {
  if (section.type !== 'product_grid') return null;
  const tileCount = Math.min(section.preferences.limit, 4);

  return (
    <section style={{ border: '1px dashed #c88', padding: 16, background: '#fdf6f6' }}>
      <strong>{section.preferences.heading}</strong>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tileCount}, 1fr)`, gap: 8, marginTop: 8 }}>
        {Array.from({ length: tileCount }).map((_, i) => (
          <div key={i} style={{ aspectRatio: '1', background: '#eee', borderRadius: 4 }} />
        ))}
      </div>
      {mode === 'live' ? null : (
        <small style={{ color: '#999' }}>🛒 sekcja commerce — storefront dostarcza realną implementację</small>
      )}
    </section>
  );
});
