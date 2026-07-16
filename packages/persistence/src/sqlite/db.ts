import { createRequire } from 'node:module';
import type { DatabaseSync } from 'node:sqlite';

// A real (non type-only) `import ... from 'node:sqlite'` trips up Vite/Vitest's builtin-module
// detection here: Vite checks `node:module`'s `builtinModules` list, which does not yet include
// `sqlite` (still experimental), strips the `node:` prefix, and then fails trying to resolve a
// bare "sqlite" package. Routing the real import through `createRequire` sidesteps Vite's static
// import analysis entirely — Node resolves it natively at runtime. The `import type` above is
// erased at compile time, so it never hits Vite's resolver.
const nodeSqlite = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');

export function createDatabase(path: string = ':memory:'): DatabaseSync {
  const db = new nodeSqlite.DatabaseSync(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS themes (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL,
      name TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      layout_sections_json TEXT NOT NULL DEFAULT '[]',
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL,
      theme_id TEXT NOT NULL,
      type TEXT NOT NULL,
      slug TEXT,
      name TEXT NOT NULL,
      sections_json TEXT NOT NULL DEFAULT '[]',
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS page_versions (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL,
      page_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
      document_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      published_at TEXT
    );

    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL,
      url TEXT NOT NULL,
      filename TEXT NOT NULL,
      content_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return db;
}

// node:sqlite's DatabaseSync has no built-in transaction helper (unlike better-sqlite3's
// `db.transaction()`) — this is the manual BEGIN/COMMIT/ROLLBACK equivalent.
export function withTransaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
