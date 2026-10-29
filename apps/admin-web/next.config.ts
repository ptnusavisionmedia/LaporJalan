import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // @laporjalan/shared is shipped as TypeScript source
  transpilePackages: ['@laporjalan/shared'],
  // evidence photos are posted through Server Actions (default limit is 1 MB)
  experimental: { serverActions: { bodySizeLimit: '9mb' } },
  serverExternalPackages: ['sharp'],
  turbopack: {
    rules: {
      '*.css': { loaders: ['@tailwindcss/turbopack'], as: '*.css' },
    },
  },
};

export default nextConfig;
