import solid from 'vite-plugin-solid';
import { defineConfig, type ViteUserConfig } from 'vitest/config';

const EXCLUDE_COVERAGE = [
  // A test measuring itself says nothing about the source it protects.
  '**/*.test.{ts,tsx}',

  // Types erase at build time, so there is no statement here for a test to reach.
  '**/*.d.ts',
  'src/lib/engine/types.ts',

  // A barrel only re-exports; the names it publishes are covered where they are declared.
  '**/index.{ts,tsx}',

  'src/lib/compat-data/generatedRegistry.ts', // generated data, not logic

  // Bootstrap entries: each reads a browser global, a DOM node or the pinned datasets and hands
  // the result to a tested function. Importing one runs it, so a test could only assert that
  // the panel mounted or that a file was written. The logic they feed is covered directly.
  'src/devtoolsMain.ts',
  'src/Main.tsx',
  'src/preview/PreviewMain.tsx',
  'src/lib/compat-data/scripts/writeRegistry.ts',
  'src/workers/analysisWorker.ts',

  // Solid compiles a template into branches no source-level test can reach, so components are
  // measured by their behaviour tests rather than by coverage. Every condition they render lives
  // in a *Utils module that is covered at 100 percent; a component holding logic is a bug.
  'src/components/**/*.tsx',

];

const config: ViteUserConfig = {
  cacheDir: '.vitest-cache',
  // Solid ships a server build by default; the browser condition is what gives tests the DOM one.
  plugins: [solid()],
  resolve: {
    tsconfigPaths: true,
    conditions: ['browser', 'development'],
  },
  test: {
    globals: true,
    unstubGlobals: true,
    watch: false,
    pool: 'threads',
    maxWorkers: process.env.CI ? '100%' : '50%',
    environment: 'happy-dom',
    setupFiles: ['./__mocks__/setupTests.ts'],
    testTimeout: 10000,
    // React's "not wrapped in act" and similar warnings only reach stderr. They mean a test is
    // asserting against a render that had not settled, so they fail the run rather than scroll by.
    onConsoleLog: (log, type) => {
      if (type === 'stderr') {
        throw new Error(`Test wrote to stderr:\n${log}`);
      }

      return undefined;
    },
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      reportsDirectory: './coverage',
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: EXCLUDE_COVERAGE,
      cleanOnRerun: false,
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
      reporter: [
        'text',
        'html',
        'lcov',
      ],
    },
    reporters: ['default'],
  },
};

export default defineConfig(config);
