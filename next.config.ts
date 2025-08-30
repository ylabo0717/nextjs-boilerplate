import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployments
  output: 'standalone',

  // Optimize for containerized environments
  experimental: {
    // Improve performance in containerized environments
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },

  // Improve build performance
  typescript: {
    // Type checking is handled separately in CI/CD pipeline
    ignoreBuildErrors: false,
  },

  eslint: {
    // ESLint checking is handled separately in CI/CD pipeline
    ignoreDuringBuilds: false,
  },

  // Optimize images for container environments
  images: {
    unoptimized: process.env.NODE_ENV === 'production',
  },

  // Enable compression
  compress: true,

  // Optimize for production
  poweredByHeader: false,

  // Custom webpack configuration for Docker
  webpack: (config, { dev, isServer }) => {
    // Optimize for container environments
    if (!dev && !isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': './src',
      };
    }

    return config;
  },

  // Configure caching headers
  async headers() {
    return [
      // Static assets - long cache
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Images and public assets - long cache
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // API routes should handle their own cache headers
      // Explicitly avoid global caching for API routes
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'X-Route-Type',
            value: 'api',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
