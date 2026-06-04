import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel/serverless';

const isDev = process.argv.includes('dev');

export default defineConfig({
  adapter: vercel(),
  root: '.',
  integrations: [react()],
  vite: {
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    // Pre-bundle React in dev with NODE_ENV=development so jsxDEV exists (fixes "jsxDEV is not a function").
    optimizeDeps: isDev
      ? {
          esbuildOptions: {
            define: {
              'process.env.NODE_ENV': '"development"',
            },
          },
        }
      : undefined,
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            hls: ['hls.js'],
          },
        },
      },
    },
    ssr: {
      noExternal: ['hls.js'],
    },
  },
});
