import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['firebase-admin', 'razorpay'],
  async rewrites() {
    return [
      {
        source: '/product/:id',
        destination: '/products/:id',
      },
      {
        source: '/product',
        destination: '/products',
      },
    ];
  },
};

export default nextConfig;
