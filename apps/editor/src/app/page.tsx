import { Canvas } from '../components/Canvas';
import { getDemoPage } from '../lib/db';

export default async function Home() {
  const page = await getDemoPage();

  return (
    <main>
      <h1 style={{ textAlign: 'center' }}>Edytor stron — demo</h1>
      <p style={{ textAlign: 'center', color: '#888' }}>
        Dodawaj i usuwaj sekcje, przeciągaj je, edytuj właściwości, przełącz na podgląd. Sekcje to
        placeholdery — component-library jeszcze nie istnieje.
      </p>
      <Canvas initialPage={page} />
    </main>
  );
}
