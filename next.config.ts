import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/(.*)',
        headers: [
          // CORS headers for Farcaster client access
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, Accept, X-Requested-With',
          },
          // Security headers
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Allow Farcaster frames to be embedded
          {
            key: 'Content-Security-Policy',
            value: "frame-src https://warpcast.com https://*.farcaster.xyz https://*.warpcast.com;",
          },
        ],
      },
      {
        // Specific headers for API routes
        source: '/api/(.*)',
        headers: [
          // Longer caching for OG images
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200',
          },
          // CORS for API routes
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, Accept, X-Requested-With, fc-signature',
          },
          // Frame-specific headers
          {
            key: 'Access-Control-Expose-Headers',
            value: 'fc-frame-signature, fc-frame-timestamp',
          },
        ],
      },
      {
        // Static assets caching
        source: '/(.*\\.(png|jpg|jpeg|gif|svg|ico|webp|avif))',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Service worker caching
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // Farcaster frame API rewrites for easier URLs
      {
        source: '/frame/:path*',
        destination: '/api/frame/:path*',
      },
      // OG image rewrites
      {
        source: '/og/:path*',
        destination: '/api/og/:path*',
      },
    ];
  },
  // Environment variables for runtime
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  },
  // Experimental features
  experimental: {
    // Optimize for PWA
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
};

export default nextConfig;
