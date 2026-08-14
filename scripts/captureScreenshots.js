import { mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';
import { createServer } from 'vite';

import { devtoolsFrame } from './devtoolsFrame.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'docs/media');

// The store rejects anything that is not exactly one of its two sizes.
const STORE = { width: 1280, height: 800 };
const STORE_SMALL = { width: 640, height: 400 };
const PANEL = { width: 1120, height: 640 };
const NARROW = { width: 420, height: 780 };

const fail = (message) => {
  process.stderr.write(`capture: ${message}\n`);
  process.exit(1);
};

const GRID_ANCHOR = 'anchor-name property';

const MODERNISE_ANCHOR = 'safe to modernise';

// The two tabs share no text, so a shot waits for the one it is about to capture.
const settle = async (page, anchor) => {
  await page.getByText(anchor).first().waitFor({ state: 'visible' });
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().map((animation) => {
      return animation.finished.catch(() => {
        return undefined;
      });
    }));
  });
};

const shot = async (page, name) => {
  await page.screenshot({ path: resolve(OUT, `${name}.png`) });
  process.stdout.write(`  ${name}.png\n`);
};

const server = await createServer({
  root: ROOT,
  mode: 'preview',
  configFile: resolve(ROOT, 'vite.config.ts'),
  server: { port: 8791, strictPort: true, host: '127.0.0.1' },
  logLevel: 'error',
});

await server.listen();

const origin = 'http://127.0.0.1:8791';
const url = `${origin}/preview.html`;
const browser = await chromium.launch();

try {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ colorScheme: theme, viewport: STORE });
    const page = await context.newPage();

    await page.goto(url);
    await settle(page, GRID_ANCHOR);
    await shot(page, `store-grid-${theme}`);

    await page.getByText(GRID_ANCHOR).first().click();
    await settle(page, GRID_ANCHOR);
    await shot(page, `store-detail-${theme}`);

    await page.getByRole('button', { name: 'Close' }).click();
    await page.getByRole('tab', { name: /Modernise/ }).click();
    await settle(page, MODERNISE_ANCHOR);
    await shot(page, `store-modernise-${theme}`);

    await page.setViewportSize(STORE_SMALL);
    await page.getByRole('tab', { name: /Findings/ }).click();
    await settle(page, GRID_ANCHOR);
    await shot(page, `store-small-${theme}`);

    await page.setViewportSize(PANEL);
    await shot(page, `readme-panel-${theme}`);

    await page.setViewportSize(NARROW);
    await shot(page, `readme-narrow-${theme}`);

    // Both panes are live iframes of the real thing; only the window chrome is drawn.
    await page.setViewportSize(STORE);
    await page.setContent(devtoolsFrame({
      pageUrl: `${origin}/e2e/fixtures/compat-page.html`,
      panelUrl: url,
      theme,
      address: 'shop.example.test/products',
    }));
    await page.locator('iframe.panel').waitFor({ state: 'visible' });
    await page.waitForLoadState('networkidle');
    await shot(page, `store-in-devtools-${theme}`);

    await context.close();
  }
}
catch (error) {
  fail(error instanceof Error ? error.message : 'screenshots could not be captured');
}
finally {
  await browser.close();
  await server.close();
}

process.stdout.write(`\nWrote to ${OUT}\n`);
