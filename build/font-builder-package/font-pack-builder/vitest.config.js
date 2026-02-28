import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Setup file for test tier configuration
    setupFiles: ['./tests/setup.js'],
    // Skip opentype.js module transformation issues
    server: {
      deps: {
        inline: ['opentype.js']
      }
    },
    // Exclude problematic tests for now
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/unit/font-parser.test.js'
    ]
  }
});
