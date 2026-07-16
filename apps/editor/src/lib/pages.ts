import { join } from 'node:path';
import { FilePageRepository, GitHubPageRepository, type PageRepository } from '@editor/persistence';
import type { Page } from '@editor/schema';

// Server-only module. The editor edits the shop's page documents where they actually live in
// "własne repo" mode (docs/ARCHITEKTURA.md): as JSON inside the shop's storefront repo.
//
// Which repository backs that is a config choice, not a code change — the whole point of the
// PageRepository abstraction:
//
//   - default (dev/demo): FilePageRepository against apps/storefront-demo's content dir, so the
//     editor and the storefront share one file on disk and the round-trip is visible locally.
//   - production ("własne repo"): set GITHUB_* env and the exact same editor commits to the shop's
//     real repo instead; the Vercel deploy that follows is the publish.
//
// Nothing above this line — canvas, commands, renderer — knows the difference.
export const STORE_ID = process.env.EDITOR_STORE_ID ?? 'demo-store';
export const PAGE_ID = process.env.EDITOR_PAGE_ID ?? 'page_home';

function createRepository(): PageRepository {
  const owner = process.env.GITHUB_CONTENT_OWNER;
  const repo = process.env.GITHUB_CONTENT_REPO;
  const token = process.env.GITHUB_CONTENT_TOKEN;

  if (owner && repo && token) {
    return new GitHubPageRepository({
      owner,
      repo,
      token,
      branch: process.env.GITHUB_CONTENT_BRANCH,
      contentDir: process.env.GITHUB_CONTENT_DIR,
    });
  }

  const contentDir = process.env.EDITOR_CONTENT_DIR ?? join(process.cwd(), '..', 'storefront-demo', 'content');
  return new FilePageRepository(contentDir);
}

export const pages = createRepository();

export async function getDemoPage(): Promise<Page> {
  const page = await pages.read(STORE_ID, PAGE_ID);
  if (!page) {
    throw new Error(`Brak dokumentu strony "${PAGE_ID}" dla sklepu "${STORE_ID}"`);
  }
  return page;
}
