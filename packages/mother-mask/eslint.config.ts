import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import json from '@eslint/json'
import markdown from '@eslint/markdown'

export default [
  {
    ignores: ['dist/**', 'coverage/**', '**/*.min.js', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.d.ts'],
    rules: {
      'no-undef': 'off',
    },
  },
  {
    files: ['tests/**/*.{ts,tsx,js,jsx}'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },
  {
    files: ['**/*.json'],
    ...json.configs.recommended,
  },
  {
    files: ['**/*.jsonc'],
    ...json.configs.recommended,
    language: 'json/jsonc',
  },
  {
    files: ['**/*.md'],
    processor: markdown.processors.markdown,
  },
  ...markdown.configs.recommended,
  {
    files: ['**/*.md', '**/*.md/*.js', '**/*.md/*.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-expressions': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['**/*.json', '**/*.jsonc'],
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-expressions': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['**/*.{ts,mts,cts,tsx}', '**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-console': 'warn',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs,jsx}'],
    rules: {
      'no-unused-vars': 'warn',
      'no-unused-expressions': 'warn',
      'no-undef': 'warn',
      'no-console': 'warn',
    },
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'warn',
    },
  },
]
