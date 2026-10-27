import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 등 하위 경로 배포를 고려해 상대 경로 base 사용
export default defineConfig({
  plugins: [react()],
  base: './',
});
