import { z } from 'zod';
import { BlockStyleSchema, IdSchema } from './common.js';

// Composable pieces nested inside container sections (Hero, Columns, Header, Footer, Navigation).
// See docs/COMPATIBILITY_MATRIX.md section 4 for the mapping from the 16 legacy Rails block types.
export const BLOCK_TYPES = ['button', 'image', 'rich_text', 'navigation'] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

const BaseBlockSchema = z.object({
  id: IdSchema,
  position: z.number().int().min(0),
  style: BlockStyleSchema.default({}),
});

export const ButtonBlockSchema = BaseBlockSchema.extend({
  type: z.literal('button'),
  preferences: z.object({
    label: z.string().min(1),
    href: z.string().min(1),
    openInNewTab: z.boolean().default(false),
  }),
});

export const ImageBlockSchema = BaseBlockSchema.extend({
  type: z.literal('image'),
  preferences: z.object({
    assetId: z.string().nullable().default(null),
    alt: z.string().default(''),
  }),
});

export const RichTextBlockSchema = BaseBlockSchema.extend({
  type: z.literal('rich_text'),
  preferences: z.object({
    html: z.string().default(''),
  }),
});

export const NavigationBlockSchema = BaseBlockSchema.extend({
  type: z.literal('navigation'),
  preferences: z.object({
    label: z.string().min(1),
    href: z.string().nullable().default(null),
    linkedPageId: z.string().nullable().default(null),
  }),
});

export const BlockSchema = z.discriminatedUnion('type', [
  ButtonBlockSchema,
  ImageBlockSchema,
  RichTextBlockSchema,
  NavigationBlockSchema,
]);

export type Block = z.infer<typeof BlockSchema>;
