import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base '/' = eigen (sub)domein. Draait de app onder een pad (bv. /leefnu/),
// zet dan base: '/leefnu/' – de service worker en manifest volgen dat pad.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    target: 'es2019',
    sourcemap: false,
  },
});
