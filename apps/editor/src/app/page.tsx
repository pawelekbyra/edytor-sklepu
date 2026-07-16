import { Canvas } from '../components/Canvas';
import { getDemoPage } from '../lib/db';

export default async function Home() {
  const page = await getDemoPage();

  return (
    <main>
      <h1 style={{ textAlign: 'center' }}>Canvas demo — Etap 6</h1>
      <p style={{ textAlign: 'center', color: '#888' }}>
        Przeciągnij sekcje, żeby zmienić kolejność. Sekcje to placeholdery — component-library jeszcze nie istnieje.
      </p>
      <Canvas initialPage={page} />
    </main>
  );
}
