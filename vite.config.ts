import { defineConfig } from 'vite';

// 기존 vanilla UI를 유지하면서 TS 모듈을 번들한다.
// 엔트리는 루트의 index.html (Vite 기본 동작).
export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  preview: {
    host: '0.0.0.0',
    port: 8000,
  },
});
