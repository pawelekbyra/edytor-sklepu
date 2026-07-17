import { PageSchema } from '@pawelekbyra/schema';
import { describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '../src/errors.js';
import { GitHubPageRepository } from '../src/github/GitHubPageRepository.js';

const homepage = PageSchema.parse({
  id: 'page_home',
  storeId: 'demo-store',
  themeId: 'theme_1',
  type: 'homepage',
  name: 'Homepage',
  sections: [{ id: 'sec_1', type: 'hero', position: 0, preferences: { heading: 'Cześć' } }],
});

function encode(page: unknown): string {
  return Buffer.from(JSON.stringify(page), 'utf8').toString('base64');
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function repoWith(fetchImpl: typeof fetch, overrides: Record<string, unknown> = {}) {
  return new GitHubPageRepository({
    owner: 'acme',
    repo: 'shop-storefront',
    token: 'secret-token',
    fetchImpl,
    ...overrides,
  });
}

describe('GitHubPageRepository', () => {
  it('reads and decodes a page document from the contents API', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ content: encode(homepage), sha: 'abc123' })) as unknown as typeof fetch;
    const page = await repoWith(fetchImpl).read('demo-store', 'page_home');

    expect(page?.name).toBe('Homepage');
    expect(page?.sections[0]?.type).toBe('hero');
  });

  it('requests the right path and authenticates with the token', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ content: encode(homepage), sha: 'abc123' })) as unknown as typeof fetch;
    await repoWith(fetchImpl).read('demo-store', 'page_home');

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/repos/acme/shop-storefront/contents/content/demo-store/page_home.json');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret-token');
  });

  it('returns null (not a throw) when the document does not exist yet', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 404 })) as unknown as typeof fetch;
    expect(await repoWith(fetchImpl).read('demo-store', 'nope')).toBeNull();
  });

  it('create commits the document with no sha (new file)', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ content: {}, commit: {} }, 201)) as unknown as typeof fetch;
    await repoWith(fetchImpl).create('demo-store', homepage);

    const [, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(init.method).toBe('PUT');
    expect(body.sha).toBeUndefined();
    expect(JSON.parse(Buffer.from(body.content, 'base64').toString('utf8')).name).toBe('Homepage');
  });

  // The sha is what makes a concurrent edit fail loudly instead of silently overwriting someone
  // else's commit — GitHub rejects a PUT whose sha no longer matches the current blob.
  it('update sends the current blob sha so a stale write is rejected', async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      if (!init?.method) return jsonResponse({ content: encode(homepage), sha: 'sha-of-current' });
      return jsonResponse({ commit: {} });
    }) as unknown as typeof fetch;

    await repoWith(fetchImpl).update('demo-store', 'page_home', { name: 'Strona główna' });

    const putCall = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls.find(([, init]) => init?.method === 'PUT');
    const body = JSON.parse(putCall[1].body as string);
    expect(body.sha).toBe('sha-of-current');
    expect(JSON.parse(Buffer.from(body.content, 'base64').toString('utf8')).name).toBe('Strona główna');
  });

  it('update throws NotFoundError for a document that does not exist', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 404 })) as unknown as typeof fetch;
    await expect(repoWith(fetchImpl).update('demo-store', 'nope', { name: 'x' })).rejects.toThrow(NotFoundError);
  });

  it('surfaces a rejected write instead of swallowing it', async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      if (!init?.method) return jsonResponse({ content: encode(homepage), sha: 'stale' });
      return new Response('conflict', { status: 409 });
    }) as unknown as typeof fetch;

    await expect(repoWith(fetchImpl).update('demo-store', 'page_home', { name: 'x' })).rejects.toThrow(/409/);
  });

  it('targets an explicit branch when configured', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ content: encode(homepage), sha: 'abc' })) as unknown as typeof fetch;
    await repoWith(fetchImpl, { branch: 'main' }).read('demo-store', 'page_home');

    const [url] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('ref=main');
  });

  it('lists documents for a store, ignoring non-json entries', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('page_home.json')) return jsonResponse({ content: encode(homepage), sha: 'a' });
      return jsonResponse([
        { name: 'page_home.json', type: 'file' },
        { name: 'README.md', type: 'file' },
        { name: 'drafts', type: 'dir' },
      ]);
    }) as unknown as typeof fetch;

    const pages = await repoWith(fetchImpl).listByStore('demo-store');
    expect(pages.map((p) => p.id)).toEqual(['page_home']);
  });

  it('lists empty for a store with no content directory yet', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 404 })) as unknown as typeof fetch;
    expect(await repoWith(fetchImpl).listByStore('ghost')).toEqual([]);
  });
});
