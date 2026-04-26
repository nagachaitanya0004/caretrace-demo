import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/auth': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/api':  { target: 'http://127.0.0.1:8001', changeOrigin: true },
    },
  },
  build: {
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
  if (id.includes('node_modules')) {
    if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
      return 'vendor-react';
    }
    if (id.includes('framer-motion')) {
      return 'vendor-motion';
    }
    if (id.includes('recharts')) {
      return 'vendor-charts';
    }
    if (id.includes('i18next')) {
      return 'vendor-i18n';
    }
    return 'vendor';
  }
},
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.js',
  },
})
