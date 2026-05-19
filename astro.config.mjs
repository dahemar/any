import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  adapter: vercel(),
  root: '.',
  integrations: [react()],
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'hls': ['hls.js']
          }
        }
      }
    },
    ssr: {
      noExternal: ['hls.js']
    }
  }
});
