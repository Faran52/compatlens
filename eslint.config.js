import stylistic from '@stylistic/eslint-plugin';
import checkFile from 'eslint-plugin-check-file';
import importX from 'eslint-plugin-import-x';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sonarjs from 'eslint-plugin-sonarjs';
import tidy from 'eslint-plugin-tidy';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
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
  },

  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  sonarjs.configs.recommended,
  stylistic.configs.recommended,
  tidy.configs['flat/recommended'],

  {
    plugins: {
      '@stylistic': stylistic,
      'check-file': checkFile,
      'import-x': importX,
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },

    settings: {
      'import-x/resolver': {
        typescript: { alwaysTryTypes: true, project: './tsconfig.json' },
      },
    },

    rules: {
      // max-len 120 matches the bank config this was grafted from.
      '@stylistic/max-len': ['error', { code: 120, ignoreUrls: true, ignoreTemplateLiterals: true }],
      '@stylistic/semi': ['error', 'always'],
      // allowSingleLine off: a one-line arrow body reads as an expression arrow at a glance, and
      // this codebase always uses an explicit return. stroustrup to match the existing } catch {.
      '@stylistic/brace-style': ['error', 'stroustrup', { allowSingleLine: false }],
      // Braces always. A braceless if reads fine until someone adds a second statement under it.
      'curly': ['error', 'all'],
      // The stylistic preset ships semi: never and member-delimiter-style: none as a matched pair.
      // Overriding only semi left statements ending in a semicolon and interface members not.
      '@stylistic/member-delimiter-style': ['error', {
        multiline: { delimiter: 'semi', requireLast: true },
        singleline: { delimiter: 'semi', requireLast: false },
      }],
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],

      // Local rules with no upstream equivalent: import and export shape, destructuring and union
      // layout, interface member order, and the arrow / await / catch preferences.
      // The two tidy holds back from recommended; the third of them sorts React hook deps.
      'tidy/union-newline': 'error',
      'tidy/interface-order': 'error',
      '@stylistic/jsx-quotes': ['error', 'prefer-double'],

      'import-x/no-unresolved': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/first': 'error',
      'import-x/newline-after-import': 'error',
      'import-x/no-cycle': 'error',

      // Grafted from the reference config's IMPORT_SORT_GROUPS, with its Redux, hocs, providers,
      // apis, store and services buckets dropped: none of them exist here. The shape it cares
      // about is kept exactly, in particular that type imports get their own group near the end
      // and that style imports are always last.
      'simple-import-sort/imports': ['error', {
        groups: [
          ['^node:', '^fs$', '^path$'],
          [String.raw`^@?\w`],
          ['^@/'],
          [String.raw`^\.\.(?!/?$)`, String.raw`^\.\./?$`],
          [String.raw`^\./`],
          // Type imports, excluding css and json. simple-import-sort appends a NUL to the
          // source of a `import type` statement, which is what these two match on.
          [String.raw`^(?!.*[.](?:css|json)$)[^.].*\u0000$`, String.raw`^[.].*\u0000$`],
          // Styles, always last
          [String.raw`^.+\.s?css$`],
        ],
      }],
      'simple-import-sort/exports': 'error',

      // Unused. unused-imports owns this, so the base and TS rules must stand down.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': ['warn', {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_',
      }],

      // Arrow functions everywhere, including components.
      'func-style': ['error', 'expression'],
      'prefer-arrow-callback': 'error',

      'sonarjs/cognitive-complexity': ['error', 15],

      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },

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

  {
    files: ['src/**/*.{ts,tsx}', 'e2e/**/*.ts'],
    rules: {
      'check-file/filename-naming-convention': ['error', {
        'src/**/*.tsx': 'PASCAL_CASE',
        'src/**/*.ts': 'CAMEL_CASE',
        'e2e/**/*.ts': 'CAMEL_CASE',
      }, { ignoreMiddleExtensions: true }],
      'check-file/folder-naming-convention': ['error', {
        'src/**/': 'KEBAB_CASE',
      }],
    },
  },

  // Config and tooling files sit outside the typed program.
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
    rules: {
      'no-console': 'off',
    },
  },
);
