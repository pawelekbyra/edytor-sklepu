import { Canvas } from '../components/Canvas';
import { getDemoPage } from '../lib/pages';

// The document is read from disk per request so a save is reflected on reload.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const page = await getDemoPage();

  return (
    <main>
      <h1 style={{ textAlign: 'center' }}>Edytor stron — demo</h1>
      <p style={{ textAlign: 'center', color: '#888' }}>
        Dodawaj i usuwaj sekcje, przeciągaj je, edytuj właściwości, przełącz na podgląd. Sekcje
        treści pochodzą z <code>@pawelekbyra/component-library</code> — tych samych komponentów używa
        storefront, dlatego podgląd odpowiada opublikowanej stronie.
      </p>
      <Canvas initialPage={page} />
    </main>
  );
}
