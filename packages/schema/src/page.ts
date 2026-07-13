import { z } from 'zod';
import { IdSchema } from './common.js';
import { SectionSchema } from './section.js';

// The 15 canonical page types retained from the former Rails implementation.
// See docs/MACIERZ_ZGODNOSCI.md section 2 for their current rewrite status.
export const PAGE_TYPES = [
  'homepage',
  'custom',
  'product-details',
  'taxon',
  'taxon-list',
  'shop-all',
  'search-results',
  'cart',
  'checkout',
  'wishlist',
  'account',
  'login',
  'password',
  'post',
  'post-list',
] as const;
export type PageType = (typeof PAGE_TYPES)[number];

export const PageSchema = z.object({
  id: IdSchema,
  storeId: IdSchema,
  themeId: IdSchema,
  type: z.enum(PAGE_TYPES),
  slug: z.string().nullable().default(null),
  name: z.string().min(1),
  sections: z.array(SectionSchema).default([]),
});

export type Page = z.infer<typeof PageSchema>;
