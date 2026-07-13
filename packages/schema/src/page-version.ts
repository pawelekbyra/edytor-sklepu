import { z } from 'zod';
import { IdSchema } from './common.js';
import { PageSchema } from './page.js';

// Replaces Rails' preview-record-duplication (Spree::Previewable, Page#create_preview/#promote)
// with an explicit draft/published version of the same page document.
export const PageVersionSchema = z
  .object({
    id: IdSchema,
    pageId: IdSchema,
    status: z.enum(['draft', 'published']),
    document: PageSchema,
    createdAt: z.string().datetime(),
    publishedAt: z.string().datetime().nullable().default(null),
  })
  .refine((version) => version.status !== 'published' || version.publishedAt !== null, {
    message: 'publishedAt is required when status is "published"',
    path: ['publishedAt'],
  });

export type PageVersion = z.infer<typeof PageVersionSchema>;
