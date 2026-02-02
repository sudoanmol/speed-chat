import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'adventurous-dog-322.convex.cloud',
      },
    ],
  },
  devIndicators: false,
  reactCompiler: true,
}

export default nextConfig
