import { z } from 'zod';

export const IdSchema = z.string().min(1);

export const HexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/)
  .nullable();

// Mirrors Spree::PageSection base preferences and their *_DEFAULT constants
// (page_builder/app/models/spree/page_section.rb).
export const SectionStyleSchema = z.object({
  textColor: HexColorSchema.default(null),
  backgroundColor: HexColorSchema.default(null),
  borderColor: HexColorSchema.default(null),
  topPadding: z.number().int().default(40),
  bottomPadding: z.number().int().default(40),
  topBorderWidth: z.number().int().default(1),
  bottomBorderWidth: z.number().int().default(0),
});

// Mirrors Spree::PageBlock base preferences and their *_DEFAULT constants
// (page_builder/app/models/spree/page_block.rb).
export const BlockStyleSchema = z.object({
  textAlignment: z.enum(['left', 'center', 'right']).default('left'),
  containerAlignment: z.enum(['left', 'center', 'right']).default('left'),
  size: z.enum(['small', 'medium', 'large']).default('medium'),
  widthDesktop: z.number().int().min(1).max(100).default(100),
  topPadding: z.number().int().default(0),
  bottomPadding: z.number().int().default(0),
});
