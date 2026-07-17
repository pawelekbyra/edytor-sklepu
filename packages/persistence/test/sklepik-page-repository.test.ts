import { describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '../src/errors.js';
import { SklepikPageRepository } from '../src/sklepik/SklepikPageRepository.js';

const adminPage = {
  id: 'sfpage_abc123',
  slug: 'home',
  title: 'Strona główna',
  draft_document: {
    schemaVersion: 1,
    sections: [{ id: 'sec_1', type: 'hero', position: 0, preferences: { heading: 'Cześć', subheading: '', backgroundImageAssetId: null } }],
  },
  published_document: null,
  published_at: null,
  published_by_id: null,
  lock_version: 3,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function repoWith(fetchImpl: typeof fetch) {
  return new SklepikPageRepository({
    baseUrl: 'https://backend.example.com/api/v3/admin',
    authToken: 'jwt-token',
    fetchImpl,
  });
}

describe('SklepikPageRepository', () => {
  it('reads and maps the singleton homepage document', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(adminPage)) as unknown as typeof fetch;
    const page = await repoWith(fetchImpl).read('store_1', 'home');

    expect(page?.id).toBe('home');
    expect(page?.name).toBe('Strona główna');
    expect(page?.sections[0]?.type).toBe('hero');
    expect(page?.type).toBe('homepage');
  });

  it('returns null for a pageId other than the homepage singleton', async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    expect(await repoWith(fetchImpl).read('store_1', 'about')).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('sends the store id header and bearer token', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(adminPage)) as unknown as typeof fetch;
    await repoWith(fetchImpl).read('store_1', 'home');

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://backend.example.com/api/v3/admin/storefront_page');
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Spree-Store-Id']).toBe('store_1');
    expect(headers.Authorization).toBe('Bearer jwt-token');
  });

  it('returns null (not a throw) when the store has no homepage yet', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 404 })) as unknown as typeof fetch;
    expect(await repoWith(fetchImpl).read('store_1', 'home')).toBeNull();
  });

  it('update fetches the current lock_version and sends it back with the PATCH', async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      if (!init?.method) return jsonResponse(adminPage);
      return jsonResponse({ ...adminPage, title: 'Nowy tytuł', lock_version: 4 });
    }) as unknown as typeof fetch;

    const page = await repoWith(fetchImpl).update('store_1', 'home', { name: 'Nowy tytuł' });

    const patchCall = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls.find(([, init]) => init?.method === 'PATCH');
    const body = JSON.parse(patchCall[1].body as string);
    expect(body.lock_version).toBe(3);
    expect(body.title).toBe('Nowy tytuł');
    expect(page.name).toBe('Nowy tytuł');
  });

  it('update throws NotFoundError when the store has no homepage yet', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 404 })) as unknown as typeof fetch;
    await expect(repoWith(fetchImpl).update('store_1', 'home', { name: 'x' })).rejects.toThrow(NotFoundError);
  });

  it('surfaces an optimistic-lock conflict instead of swallowing it', async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      if (!init?.method) return jsonResponse(adminPage);
      return new Response('conflict', { status: 409 });
    }) as unknown as typeof fetch;

    await expect(repoWith(fetchImpl).update('store_1', 'home', { name: 'x' })).rejects.toThrow(/optimistic lock/);
  });

  it('update rejects a pageId other than the homepage singleton', async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    await expect(repoWith(fetchImpl).update('store_1', 'about', { name: 'x' })).rejects.toThrow(NotFoundError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('delete is explicitly unsupported', async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    await expect(repoWith(fetchImpl).delete('store_1', 'home')).rejects.toThrow(/does not support deleting/);
  });

  it('listByStore returns the single homepage, or empty if none exists yet', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(adminPage)) as unknown as typeof fetch;
    const pages = await repoWith(fetchImpl).listByStore('store_1');
    expect(pages.map((p) => p.id)).toEqual(['home']);

    const emptyFetch = vi.fn(async () => new Response('', { status: 404 })) as unknown as typeof fetch;
    expect(await repoWith(emptyFetch).listByStore('store_2')).toEqual([]);
  });

  it('create rejects any id other than the homepage singleton', async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    await expect(
      repoWith(fetchImpl).create('store_1', {
        id: 'about',
        storeId: 'store_1',
        themeId: 'default',
        type: 'custom',
        slug: 'about',
        name: 'About',
        sections: [],
      }),
    ).rejects.toThrow(/only supports the single homepage/);
  });

  it('publish POSTs to the publish sub-route and returns the published snapshot', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ...adminPage, published_at: '2026-07-17T00:00:00Z' })) as unknown as typeof fetch;
    const page = await repoWith(fetchImpl).publish('store_1');

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://backend.example.com/api/v3/admin/storefront_page/publish');
    expect(init.method).toBe('POST');
    expect(page.name).toBe('Strona główna');
  });
});
