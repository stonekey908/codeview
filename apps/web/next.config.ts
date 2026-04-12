import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@codeview/shared', '@codeview/analyzer', '@codeview/graph-engine'],
};

export default nextConfig;
