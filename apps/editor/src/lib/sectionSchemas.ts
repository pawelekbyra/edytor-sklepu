import { SectionSchema, type SectionType } from '@editor/schema';
import type { z } from 'zod';
import { preferencesObjectSchema } from './fieldsFromSchema';

// Built once from the discriminated union already exported by @editor/schema — no separate
// type -> schema map to keep in sync by hand.
export const SECTION_PREFERENCES_SCHEMA: ReadonlyMap<SectionType, z.ZodObject<z.ZodRawShape>> = new Map(
  SectionSchema.options.map((option) => [
    option.shape.type.value as SectionType,
    preferencesObjectSchema(option.shape.preferences),
  ]),
);
