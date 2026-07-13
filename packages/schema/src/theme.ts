import { z } from 'zod';
import { IdSchema } from './common.js';
import { SectionSchema } from './section.js';

// Mirrors Spree::Theme (page_builder/app/models/spree/theme.rb): belongs_to :store enforces
// per-store isolation — storeId is required on every persistence operation, not just this schema.
export const ThemeSchema = z.object({
  id: IdSchema,
  storeId: IdSchema,
  name: z.string().min(1),
  isDefault: z.boolean().default(false),
  // Header/footer/newsletter/announcement-bar sections attached directly to the theme,
  // mirroring Theme#layout_sections in Rails.
  layoutSections: z.array(SectionSchema).default([]),
});

export type Theme = z.infer<typeof ThemeSchema>;
