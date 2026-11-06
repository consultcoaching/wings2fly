import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base '/' = eigen (sub)domein. Draait de app onder een pad (bv. /leefnu/),
// zet dan base: '/leefnu/' – de service worker en manifest volgen dat pad.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    // es2020: @noble/ed25519 gebruikt BigInt (Safari 14+, Chrome 67+, Firefox 68+).
    target: 'es2020',
    sourcemap: false,
  },
});
