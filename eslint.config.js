import { defineConfig } from '@linteljs/eslint-config/define-config';

// The shared layers carry the formatting, import and complexity rules this repo used to spell out
// itself. What stays here is what is true of CompatLens and of nothing else.
const config = await defineConfig({
  framework: 'solid',
  typescript: true,
  vitest: true,
  ignores: [
    // No html() layer installed: see the note in the migration report on why.
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
  // Every one is a bare barrel, imported as `from '@engine'` with nothing after it. That got no
  // bucket at all until @linteljs/eslint-config 1.1.3: the pattern ended in a slash, so these
  // sorted in among node_modules instead of in the project's own group.
  aliases: {
    '@compat-data': './src/lib/compat-data/index.ts',
    '@engine': './src/lib/engine/index.ts',
    '@extension': './src/extension/index.ts',
    '@mocks': './__mocks__/index.ts',
    '@model': './src/model/index.ts',
    '@components/features': './src/components/features/index.ts',
    '@components/ui': './src/components/ui/index.ts',
    '@utils': './src/utils/index.ts',
    '@workers': './src/workers/index.ts',
  },
  naming: {
    'src/**/*.tsx': '!([a-z]*[A-Z]*)',
    'src/**/!(*.d|*.test|*.spec).ts': 'CAMEL_CASE',
    'src/**/*.d.ts': '@(+([a-z0-9])*(-+([a-z0-9]))|+([a-z])*([a-zA-Z0-9]))',
  },
  folderNaming: {
    'src/**/': '@(+([a-z0-9])*(-+([a-z0-9]))|__tests__|\\[*\\]|\\(*\\)|{*})',
  },
  resolver: { project: './tsconfig.json' },
});

export default [
  ...config,

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
