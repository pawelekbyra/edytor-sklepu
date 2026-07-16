import { describe, expect, it } from 'vitest';
import { DemoCommerceProvider } from '../src/sqlite/DemoCommerceProvider.js';

describe('DemoCommerceProvider', () => {
  const provider = new DemoCommerceProvider();

  it('returns demo products regardless of storeId', async () => {
    const products = await provider.getProducts('any-store');
    expect(products.length).toBeGreaterThan(0);
  });

  it('returns demo categories regardless of storeId', async () => {
    const categories = await provider.getCategories('any-store');
    expect(categories.length).toBeGreaterThan(0);
  });

  it('returns the demo user by id, and null for an unknown id', async () => {
    const user = await provider.getUser('any-store', 'user_1');
    expect(user?.email).toBe('demo@example.com');

    expect(await provider.getUser('any-store', 'nope')).toBeNull();
  });
});
