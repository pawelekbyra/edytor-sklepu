import type { Category, Product, User } from '../types.js';

// Returns demo data only — we are not reimplementing commerce (see ARCHITEKTURA.md
// "Co NIE wchodzi w zakres"). A real integration swaps this for a `sklepik` Store API client.
export interface CommerceProvider {
  getProducts(storeId: string): Promise<Product[]>;
  getCategories(storeId: string): Promise<Category[]>;
  getUser(storeId: string, userId: string): Promise<User | null>;
}
