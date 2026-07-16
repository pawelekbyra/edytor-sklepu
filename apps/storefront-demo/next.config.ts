import type { NextConfig } from 'next';

// Same two workarounds as apps/editor (see that file for the full rationale): workspace packages
// ship untranspiled TS with explicit `.js` specifiers, which webpack neither transpiles inside
// node_modules nor maps back onto `.ts` without help.
const nextConfig: NextConfig = {
  transpilePackages: ['@editor/schema', '@editor/persistence', '@editor/renderer', '@editor/component-library'],
  webpack(config) {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;
