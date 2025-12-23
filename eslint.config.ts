import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      '.env.*',
      'Dockerfile',
      '**/*.config.ts',
      'config',
      'migrations',
      'seeders',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'no-console': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      'prettier/prettier': [
        'error',
        {
          singleQuote: true,
          semi: true,
          endOfLine: 'auto',
        },
      ],
    },
  },
];
