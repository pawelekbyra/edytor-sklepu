import { type Page, PageSchema, ThemeSchema } from '@editor/schema';
import { createDatabase, SQLitePageRepository, SQLiteThemeRepository } from '@editor/persistence';

// Server-only module (imported only from Server Components) — one process-wide in-memory
// database for this dev demo, reused across requests via Next.js's module cache. Etap 6 is
// canvas + drag&drop, not persistence wiring (that's Etap 9), so edits made in the browser stay
// client-side; this seed is just the starting document.
const STORE_ID = 'demo-store';
const THEME_ID = 'theme_demo';
const PAGE_ID = 'page_demo_home';

const db = createDatabase();
const themes = new SQLiteThemeRepository(db);
const pages = new SQLitePageRepository(db);

let seeded = false;

async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  seeded = true;

  await themes.create(
    STORE_ID,
    ThemeSchema.parse({ id: THEME_ID, storeId: STORE_ID, name: 'Domyślny', isDefault: true }),
  );
  await pages.create(
    STORE_ID,
    PageSchema.parse({
      id: PAGE_ID,
      storeId: STORE_ID,
      themeId: THEME_ID,
      type: 'homepage',
      name: 'Strona główna',
      sections: [
        {
          id: 'sec_hero',
          type: 'hero',
          position: 0,
          preferences: { heading: 'Kakałowy Sklepik', subheading: 'Najlepsze kakao w mieście' },
        },
        {
          id: 'sec_text',
          type: 'rich_text',
          position: 1,
          preferences: { html: '<p>Witaj w sklepie! Przeciągnij sekcje, żeby zmienić kolejność.</p>' },
        },
        {
          id: 'sec_news',
          type: 'newsletter',
          position: 2,
          preferences: { heading: 'Zapisz się na newsletter', buttonLabel: 'Subskrybuj' },
        },
      ],
    }),
  );
}

export async function getDemoPage(): Promise<Page> {
  await ensureSeeded();
  const page = await pages.read(STORE_ID, PAGE_ID);
  if (!page) throw new Error('Demo page missing after seeding');
  return page;
}
