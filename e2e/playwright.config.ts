import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: '.',
  outputDir: '../test-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${String(PORT)}`,
    ...devices['Desktop Chrome'],
  },
  // The preview build is the only one that carries the fixture page. Playwright serves it instead
  // of loading the extension, so these checks stay about layout, theme and keyboard behaviour.
  webServer: {
    cwd: '..',
    // --host 127.0.0.1 is load bearing: vite preview otherwise binds ::1 only, and baseURL below
    // would never connect.
    command: 'pnpm build:preview && pnpm exec vite preview'
      + ` --outDir dist-preview --host 127.0.0.1 --port ${String(PORT)} --strictPort`,
    url: `http://127.0.0.1:${String(PORT)}/preview.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
