import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Builds to a single inlined HTML so the prototype can be opened by double-click.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
