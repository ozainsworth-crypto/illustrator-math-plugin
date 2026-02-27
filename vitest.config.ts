import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 10000, // 增加测试超时时间到 10 秒
    hookTimeout: 10000, // 增加 hook 超时时间到 10 秒
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '*.config.js',
        '*.config.ts',
        'tests/',
      ],
    },
  },
});
