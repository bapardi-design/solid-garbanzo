import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['sim-engine'],
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
