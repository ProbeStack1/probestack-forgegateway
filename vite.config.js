import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev-only proxy so the browser can reach the senior's upstream
// services without running into CORS. In production the frontend is
// served from the same origin as forgesphere.probestack.io, so these
// proxies become no-ops (Nginx handles the routes).
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['@stoplight/spectral-core', '@stoplight/spectral-rulesets'],
  },
  server: {
    proxy: {
      '/apigee-wrapper': {
        target: 'https://forgesphere.probestack.io',
        changeOrigin: true,
        secure: true,
      },
      '/dev-token': {
        target: 'https://forgesphere.probestack.io/apigee-wrapper/auth/apigee',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/dev-token/, ''),
      },
    },
  },
});
