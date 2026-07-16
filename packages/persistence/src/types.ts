// Media metadata is a persistence-only concern (pages reference it by `assetId` inside
// `packages/schema` preferences) — it has no Zod schema of its own.
export interface Media {
  id: string;
  storeId: string;
  url: string;
  filename: string;
  contentType: string;
  size: number;
  createdAt: string;
}

// Minimal demo shapes for `CommerceProvider`. We are not reimplementing commerce (see
// ARCHITEKTURA.md "Co NIE wchodzi w zakres") — these exist only so the editor's product/category
// pickers have something to render against in the demo.
export interface Product {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  imageUrl: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}
