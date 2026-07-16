import { join } from 'node:path';
import { FilePageRepository } from '@editor/persistence';
import type { Page } from '@editor/schema';

// Server-only module. The editor edits the shop's page documents where they actually live in
// "własne repo" mode (docs/ARCHITEKTURA.md): as JSON inside the shop's storefront repo.
//
// In this demo the "shop's repo" is apps/storefront-demo, so the editor and the storefront share
// one file on disk — which is exactly what makes the round-trip demonstrable: edit here, save,
// reload the storefront, see it. In production this becomes GitHubPageRepository against the real
// shop repo (publish = commit + redeploy). Same PageRepository interface either way — that swap is
// the entire point of the persistence abstraction.
const CONTENT_DIR = process.env.EDITOR_CONTENT_DIR ?? join(process.cwd(), '..', 'storefront-demo', 'content');

export const STORE_ID = 'demo-store';
export const PAGE_ID = 'page_home';

export const pages = new FilePageRepository(CONTENT_DIR);

export async function getDemoPage(): Promise<Page> {
  const page = await pages.read(STORE_ID, PAGE_ID);
  if (!page) {
    throw new Error(`Brak dokumentu strony "${PAGE_ID}" dla sklepu "${STORE_ID}" w ${CONTENT_DIR}`);
  }
  return page;
}
