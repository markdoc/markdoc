import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Forward requests to /markdoc-api
// from the client React app to the Node.js server.
// See https://vite.dev/config/server-options.html#server-proxy
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/markdoc-api': {
        target: 'http://localhost:4242',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: './static'
  }
});
