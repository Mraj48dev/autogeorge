/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ottimizzazioni per Vercel
  experimental: {
    // Abilita Turbo per build più veloci
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },

  // Configurazione TypeScript
  typescript: {
    // Ignora errori TypeScript durante build (solo per demo)
    // In produzione reale, rimuovi questa linea
    ignoreBuildErrors: false,
  },

  // Configurazione ESLint
  eslint: {
    // Ignora errori ESLint durante build (solo per demo)
    // In produzione reale, rimuovi questa linea
    ignoreDuringBuilds: false,
  },

  // Configurazione immagini
  images: {
    domains: [
      'pixabay.com',
      'images.unsplash.com',
      'via.placeholder.com',
    ],
    formats: ['image/webp', 'image/avif'],
  },

  // Headers di sicurezza
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
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
            value: 'origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: true,
      },
    ];
  },

  // Configurazione output per Vercel
  output: 'standalone',

  // Configurazione bundle analyzer (solo in sviluppo)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config, { isServer }) => {
      if (!isServer) {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
          })
        );
      }
      return config;
    },
  }),

  // Configurazione variabili d'ambiente pubbliche
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Configurazione rewrites per API
  async rewrites() {
    return [
      {
        source: '/health',
        destination: '/api/health',
      },
    ];
  },
};

module.exports = nextConfig;