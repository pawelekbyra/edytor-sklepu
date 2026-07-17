import { registerContentSections } from '@pawelekbyra/component-library';
import { DemoCommerceProvider } from '@pawelekbyra/persistence';
import { registerSection, type SectionComponent } from '@pawelekbyra/renderer';
import type { Section } from '@pawelekbyra/schema';
import type { RenderMode } from '@pawelekbyra/renderer';

// Content sections: the exact same shared components the editor registers. This is what makes the
// editor's preview and this published page render identically.
registerContentSections();

const commerce = new DemoCommerceProvider();

// Commerce section: the storefront's OWN implementation, backed by its OWN data layer — the split
// described in docs/ARCHITEKTURA.md. Same `component_key` as the editor's static preview,
// different implementation per runtime, chosen by whichever registry is loaded.
//
// SPIKE FINDING: this is an async React Server Component, which is how a real commerce section
// must fetch its data. The registry's `SectionComponent` type is `ComponentType<...>`, which does
// not include async components, so the registration needs a cast. It renders correctly under RSC
// — but the renderer's types should be widened to admit async server components rather than
// forcing every host to cast. Tracked in docs/ARCHITEKTURA.md.
async function ProductGrid({ section }: { section: Section; mode: RenderMode }) {
  if (section.type !== 'product_grid') return null;

  const products = (await commerce.getProducts('demo-store')).slice(0, section.preferences.limit);

  return (
    <section style={{ padding: '24px 0' }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 22 }}>{section.preferences.heading}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(products.length, 1)}, 1fr)`, gap: 12 }}>
        {products.map((product) => (
          <article key={product.id} style={{ border: '1px solid #eee', borderRadius: 6, padding: 12 }}>
            <div style={{ aspectRatio: '1', background: '#f2f2f2', borderRadius: 4, marginBottom: 8 }} />
            <div style={{ fontWeight: 600 }}>{product.name}</div>
            <div style={{ opacity: 0.7 }}>{(product.priceCents / 100).toFixed(2)} zł</div>
          </article>
        ))}
      </div>
    </section>
  );
}

registerSection('product_grid', ProductGrid as unknown as SectionComponent);
