import base from 'eslint-config-lintel/base';
import typescript from 'eslint-config-lintel/typescript';

// The shared layers carry the formatting, import and complexity rules this repo used to spell out
// itself. What stays here is what is true of CompatLens and of nothing else.
export default [
  ...base({
    ignores: [
      // The shared config lints html only with its own layer, which this repo does not install.
      '**/*.html',
      '**/dist/**',
      '**/dist-firefox/**',
      '**/dist-preview/**',
      'build/**',
      'coverage/**',
      'artifacts/**',
      'test-results/**',
      'playwright-report/**',
      '.vitest-cache/**',
      'src/lib/compat-data/generatedRegistry.ts',
      '.claude/**',
      '.agents/**',
    ],
    naming: {
      'src/**/*.tsx': 'PASCAL_CASE',
      'src/**/*.ts': 'CAMEL_CASE',
      'e2e/**/*.ts': 'CAMEL_CASE',
    },
    folderNaming: { 'src/**/': 'KEBAB_CASE' },
    resolver: { project: './tsconfig.json' },
  }),
  ...typescript(),

  // The observer expressions are strings the inspected page executes, so the only honest test is
  // one that executes them too. String-matching the source proved nothing: it passed while the
  // shadow walk skipped the added node itself.
  {
    files: ['src/extension/devtools-api/pageObserver.test.ts'],
    rules: {
      '@typescript-eslint/no-implied-eval': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      'sonarjs/code-eval': 'off',
    },
  },

  // Build and packaging scripts report to a terminal, which is the one place console is the output.
  {
    files: ['**/*.js'],
    rules: { 'no-console': 'off' },
  },
];
