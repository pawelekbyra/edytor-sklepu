import { z } from 'zod';

// Introspects a preferences ZodObject to derive the form controls the property panel should
// render — "Generowanie formularzy ze schematów Zod" (docs/INSTRUKCJA_INTEGRACJI.md, Etap 7).
// Arrays/objects (e.g. testimonials.items, faq.items) are deliberately out of scope for this
// first pass — those need a proper repeatable-fields UI, not a text input.
export type FieldKind = 'string' | 'number' | 'boolean' | 'enum' | 'unsupported';

export interface FieldDescriptor {
  key: string;
  kind: FieldKind;
  options?: string[];
}

function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodDefault) return unwrap(schema._def.innerType);
  if (schema instanceof z.ZodNullable) return unwrap(schema._def.innerType);
  if (schema instanceof z.ZodOptional) return unwrap(schema._def.innerType);
  return schema;
}

export function fieldsFromPreferencesSchema(schema: z.ZodObject<z.ZodRawShape>): FieldDescriptor[] {
  return Object.entries(schema.shape).map(([key, fieldSchema]) => {
    const base = unwrap(fieldSchema as z.ZodTypeAny);
    if (base instanceof z.ZodString) return { key, kind: 'string' as const };
    if (base instanceof z.ZodNumber) return { key, kind: 'number' as const };
    if (base instanceof z.ZodBoolean) return { key, kind: 'boolean' as const };
    if (base instanceof z.ZodEnum) return { key, kind: 'enum' as const, options: [...base.options] };
    return { key, kind: 'unsupported' as const };
  });
}

export function preferencesObjectSchema(schema: z.ZodTypeAny): z.ZodObject<z.ZodRawShape> {
  return unwrap(schema) as z.ZodObject<z.ZodRawShape>;
}
