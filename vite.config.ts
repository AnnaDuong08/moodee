import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Use a relative base path to support deployment under a subpath, e.g. GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: './',
});
