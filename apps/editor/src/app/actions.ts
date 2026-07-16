'use server';

import { type Page, PageSchema } from '@editor/schema';
import { pages } from '../lib/pages';

// Writing the document is a server concern (the browser can't touch the shop's repo), so the
// canvas calls this Server Action. Re-validating here is not paranoia about our own UI: this is a
// network boundary, and anything crossing it is untrusted input.
export async function savePage(page: Page): Promise<{ savedAt: string }> {
  const parsed = PageSchema.parse(page);
  await pages.update(parsed.storeId, parsed.id, parsed);
  return { savedAt: new Date().toISOString() };
}
