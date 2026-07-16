import type { NextConfig } from 'next';

// Workspace packages ship untranspiled TS source with explicit `.js` extensions on relative
// imports (Node ESM convention — resolved fine by tsc/Vitest's "bundler" moduleResolution).
// Webpack has neither behavior by default: it won't process TS inside node_modules (pnpm
// symlinks workspace packages there) without `transpilePackages`, and it won't map a literal
// `.js` specifier onto a same-named `.ts`/`.tsx` file without `resolve.extensionAlias`.
const nextConfig: NextConfig = {
  transpilePackages: ['@editor/schema', '@editor/editor-core', '@editor/persistence', '@editor/renderer'],
  webpack(config) {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;
