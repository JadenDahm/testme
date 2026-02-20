import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['cheerio'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
