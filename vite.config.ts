import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  // CEP 环境需要相对路径
  base: './',
  server: {
    port: 5174,
    fs: {
      // 允许访问 node_modules
      allow: ['..'],
    },
  },
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    include: ['mathjax'],
  },
  resolve: {
    alias: {
      // 确保可以访问 node_modules 中的 mathjax
      mathjax: path.resolve(__dirname, 'node_modules/mathjax'),
    },
  },
});
