import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'query1.finance.yahoo.com',
      },
    ],
  },
}

export default nextConfig
