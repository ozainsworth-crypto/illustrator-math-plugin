import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettier,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    ignores: [
      'node_modules',
      'dist',
      'build',
      '*.config.js',
      'test-debug.js',
      'tools/**/*.js',
      'tools/**/*.cjs',
      'tests/**/*.js',
      'public/**/*.js',
      '**/*.html',
      // 第三方库目录
      'extension/client/lib/**',
      'extension/client/dist/**',
      // 构建产物
      'extension/client/build/**',
      // CEP 配置文件
      'extension/client/config.js',
      // 字体包数据
      'fonts/**/*.js',
      // 临时文件
      '**/*.tmp.js',
    ],
  }
);
