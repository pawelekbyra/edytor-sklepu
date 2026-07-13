import { z } from 'zod';
import { IdSchema } from './common.js';
import { SectionSchema } from './section.js';

// Mirrors the 15 Rails Spree::Pages::* STI subclasses (page_builder/app/models/spree/pages/*.rb).
// See docs/COMPATIBILITY_MATRIX.md section 2 for the full mapping.
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
