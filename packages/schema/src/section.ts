import { z } from 'zod';
import { IdSchema, SectionStyleSchema } from './common.js';
import { BlockSchema } from './block.js';

// The 16 canonical section types planned for the component library.
// See docs/ARCHITEKTURA.md and docs/MACIERZ_ZGODNOSCI.md section 3 for current status.
export const SECTION_TYPES = [
  'hero',
  'header',
  'footer',
  'product_grid',
  'category_grid',
  'image_banner',
  'rich_text',
  'newsletter',
  'testimonials',
  'faq',
  'video',
  'spacer',
  'columns',
  'button',
  'image',
  'navigation',
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

const BaseSectionSchema = z.object({
  id: IdSchema,
  position: z.number().int().min(0),
  style: SectionStyleSchema.default({}),
});

export const HeroSectionSchema = BaseSectionSchema.extend({
  type: z.literal('hero'),
  preferences: z.object({
    heading: z.string().default(''),
    subheading: z.string().default(''),
    backgroundImageAssetId: z.string().nullable().default(null),
  }),
  blocks: z.array(BlockSchema).default([]),
});

export const HeaderSectionSchema = BaseSectionSchema.extend({
  type: z.literal('header'),
  preferences: z.object({
    logoAssetId: z.string().nullable().default(null),
    stickyOnScroll: z.boolean().default(true),
  }),
  blocks: z.array(BlockSchema).default([]),
});

export const FooterSectionSchema = BaseSectionSchema.extend({
  type: z.literal('footer'),
  preferences: z.object({
    copyrightText: z.string().default(''),
  }),
  blocks: z.array(BlockSchema).default([]),
});

export const ProductGridSectionSchema = BaseSectionSchema.extend({
  type: z.literal('product_grid'),
  preferences: z.object({
    heading: z.string().default(''),
    taxonId: z.string().nullable().default(null),
    limit: z.number().int().min(1).default(8),
  }),
});

export const CategoryGridSectionSchema = BaseSectionSchema.extend({
  type: z.literal('category_grid'),
  preferences: z.object({
    heading: z.string().default(''),
    taxonIds: z.array(z.string()).default([]),
  }),
});

// heightPx/overlayTransparency defaults mirror the former
// Spree::PageSections::ImageBanner values: HEIGHT=384, OVERLAY_TRANSPARENCY=40.
export const ImageBannerSectionSchema = BaseSectionSchema.extend({
  type: z.literal('image_banner'),
  preferences: z.object({
    imageAssetId: z.string().nullable().default(null),
    heightPx: z.number().int().min(1).default(384),
    overlayTransparency: z.number().int().min(0).max(100).default(40),
    verticalAlignment: z.enum(['top', 'middle', 'bottom']).default('middle'),
  }),
  blocks: z.array(BlockSchema).default([]),
});

export const RichTextSectionSchema = BaseSectionSchema.extend({
  type: z.literal('rich_text'),
  preferences: z.object({
    html: z.string().default(''),
  }),
});

export const NewsletterSectionSchema = BaseSectionSchema.extend({
  type: z.literal('newsletter'),
  preferences: z.object({
    heading: z.string().default(''),
    subheading: z.string().default(''),
    buttonLabel: z.string().default('Subscribe'),
  }),
});

export const TestimonialsSectionSchema = BaseSectionSchema.extend({
  type: z.literal('testimonials'),
  preferences: z.object({
    heading: z.string().default(''),
    items: z
      .array(
        z.object({
          author: z.string().min(1),
          quote: z.string().min(1),
          ratingStars: z.number().int().min(1).max(5).optional(),
        }),
      )
      .default([]),
  }),
});

export const FaqSectionSchema = BaseSectionSchema.extend({
  type: z.literal('faq'),
  preferences: z.object({
    heading: z.string().default(''),
    items: z
      .array(
        z.object({
          question: z.string().min(1),
          answer: z.string().min(1),
        }),
      )
      .default([]),
  }),
});

export const VideoSectionSchema = BaseSectionSchema.extend({
  type: z.literal('video'),
  preferences: z.object({
    videoUrl: z.string().min(1),
    autoplay: z.boolean().default(false),
  }),
});

export const SpacerSectionSchema = BaseSectionSchema.extend({
  type: z.literal('spacer'),
  preferences: z.object({
    heightPx: z.number().int().min(1).default(40),
  }),
});

export const ColumnsSectionSchema = BaseSectionSchema.extend({
  type: z.literal('columns'),
  preferences: z.object({
    columnCount: z.number().int().min(1).max(6).default(2),
  }),
  blocks: z.array(BlockSchema).default([]),
});

export const ButtonSectionSchema = BaseSectionSchema.extend({
  type: z.literal('button'),
  preferences: z.object({
    label: z.string().min(1),
    href: z.string().min(1),
    openInNewTab: z.boolean().default(false),
  }),
});

export const ImageSectionSchema = BaseSectionSchema.extend({
  type: z.literal('image'),
  preferences: z.object({
    assetId: z.string().nullable().default(null),
    alt: z.string().default(''),
  }),
});

export const NavigationSectionSchema = BaseSectionSchema.extend({
  type: z.literal('navigation'),
  preferences: z.object({}).default({}),
  blocks: z.array(BlockSchema).default([]),
});

export const SectionSchema = z.discriminatedUnion('type', [
  HeroSectionSchema,
  HeaderSectionSchema,
  FooterSectionSchema,
  ProductGridSectionSchema,
  CategoryGridSectionSchema,
  ImageBannerSectionSchema,
  RichTextSectionSchema,
  NewsletterSectionSchema,
  TestimonialsSectionSchema,
  FaqSectionSchema,
  VideoSectionSchema,
  SpacerSectionSchema,
  ColumnsSectionSchema,
  ButtonSectionSchema,
  ImageSectionSchema,
  NavigationSectionSchema,
]);

export type Section = z.infer<typeof SectionSchema>;
