import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    host: true,
    port: 5173,
    watch: {
      // Prevent build output and large binary assets from triggering dev reloads
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.git/**',
        '**/public/models/**',
      ],
      usePolling: false,
    },
  },

  optimizeDeps: {
    // Pre-bundle heavy deps so cold starts don't trigger re-optimization mid-session
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      'zustand',
      'three',
      '@supabase/supabase-js',
    ],
    // No exclude list — only exclude packages that are actually installed
  },

  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/framer-motion') ||
              id.includes('node_modules/motion-')) {
            return 'vendor-motion';
          }
          if (id.includes('node_modules/three')) {
            return 'vendor-three';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
        },
      },
    },
  },
});
