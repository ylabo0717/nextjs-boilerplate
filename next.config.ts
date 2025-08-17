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
};

export default nextConfig;
