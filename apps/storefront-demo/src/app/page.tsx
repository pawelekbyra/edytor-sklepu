import { join } from 'node:path';
import { FilePageRepository } from '@editor/persistence';
import { renderPage } from '@editor/renderer';
import '../lib/sections'; // registers content + commerce sections for THIS runtime

// "Własne repo" mode: the page document is a JSON file in this repo, read through the same
// `PageRepository` interface the editor uses against SQLite/an API (docs/ARCHITEKTURA.md).
const pages = new FilePageRepository(join(process.cwd(), 'content'));

export default async function Home() {
  const page = await pages.read('demo-store', 'page_home');
  if (!page) return <main style={{ padding: 24 }}>Brak dokumentu strony.</main>;

  return (
    <main>
      <div style={{ background: '#111', color: '#eee', padding: '6px 12px', fontSize: 12 }}>
        storefront demo — renderuje <code>content/demo-store/page_home.json</code> przez
        <code> @editor/renderer</code> w trybie <code>live</code>
      </div>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>{renderPage(page, { mode: 'live' })}</div>
    </main>
  );
}
