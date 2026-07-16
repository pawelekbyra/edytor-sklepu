import type { CommerceProvider } from '../repositories/CommerceProvider.js';
import type { Category, Product, User } from '../types.js';

const DEMO_PRODUCTS: Product[] = [
  { id: 'prod_1', name: 'Kakao 70%', slug: 'kakao-70', priceCents: 2499, imageUrl: null },
  { id: 'prod_2', name: 'Kakao 85%', slug: 'kakao-85', priceCents: 2999, imageUrl: null },
];

const DEMO_CATEGORIES: Category[] = [{ id: 'cat_1', name: 'Kakao', slug: 'kakao' }];

const DEMO_USER: User = { id: 'user_1', email: 'demo@example.com', name: 'Demo User' };

// Fixed demo fixtures, identical for every storeId — this is not real commerce logic (see
// ARCHITEKTURA.md "Co NIE wchodzi w zakres"), just enough for the editor's pickers to render.
export class DemoCommerceProvider implements CommerceProvider {
  async getProducts(_storeId: string): Promise<Product[]> {
    return DEMO_PRODUCTS;
  }

  async getCategories(_storeId: string): Promise<Category[]> {
    return DEMO_CATEGORIES;
  }

  async getUser(_storeId: string, userId: string): Promise<User | null> {
    return userId === DEMO_USER.id ? DEMO_USER : null;
  }
}
