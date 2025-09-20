import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'src/tests/e2e/**/*',
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,ts,jsx,tsx}'],
      exclude: [
        'src/tests/**/*',
        'src/**/*.test.*',
        'src/**/*.spec.*',
        'src/**/*.d.ts',
        'src/app/**/*', // Next.js app directory
        'src/composition-root/main.ts', // Entry point
        '**/*.config.*',
        '**/types.ts',
      ],
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // Higher standards for domain layer
        'src/modules/*/domain/**/*': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        // Application layer standards
        'src/modules/*/application/**/*': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 4,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/tests': path.resolve(__dirname, './src/tests'),
    },
  },
});