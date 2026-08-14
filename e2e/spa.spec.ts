import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

import { OBSERVER_DRAIN_EXPRESSION, OBSERVER_INSTALL_EXPRESSION } from '../src/extension/devtools-api/pageObserver';

import type { Page } from '@playwright/test';

interface Sheet {
  url: string;
  text: string;
  map?: string;
}

interface Batch {
  route: string;
  fragments: readonly string[];
  dropped: number;
  stylesheets: readonly Sheet[];
}

const FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures/spa.html');

// Wait for the heading this route renders, not for any card: the previous route's card is still
// on screen at the moment of the click, so a generic wait resolves before the swap.
const HEADINGS: Readonly<Record<string, string>> = {
  '/products': 'Products',
  '/checkout': 'Checkout',
  '/settings': 'Settings',
};

const isBatch = (value: unknown): value is Batch => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (!('route' in value) || !('fragments' in value) || !('dropped' in value)) {
    return false;
  }

  if (!('stylesheets' in value) || !Array.isArray(value.stylesheets)) {
    return false;
  }

  return typeof value.route === 'string'
    && Array.isArray(value.fragments)
    && typeof value.dropped === 'number';
};

// The fixture is in no build, and pushState needs a real origin, so serve it from disk.
const openSpa = async (page: Page): Promise<void> => {
  const body = await readFile(FIXTURE, 'utf8');

  await page.route('**/spa.html', async (route) => {
    await route.fulfill({ body, contentType: 'text/html' });
  });
  await page.goto('/spa.html');
};

const install = async (page: Page): Promise<void> => {
  await page.evaluate(OBSERVER_INSTALL_EXPRESSION);
};

const drain = async (page: Page): Promise<Batch> => {
  // `page.evaluate` already answers `unknown` for a string expression; the guard below is what narrows it.
  const result = await page.evaluate(OBSERVER_DRAIN_EXPRESSION);

  if (!isBatch(result)) {
    throw new Error('the drain returned no batch');
  }

  return result;
};

const goTo = async (page: Page, route: string): Promise<void> => {
  await page.getByRole('button', { name: route }).click();
  await expect(page.locator('#route')).toHaveText(route);
  // `?? route` rather than passing a possibly-absent name: a route with no heading recorded should fail on the
  // locator, not by asking Playwright to match anything.
  await page.getByRole('heading', { name: HEADINGS[route] ?? route }).waitFor({ state: 'visible' });
};

test.describe('watching a single-page app', () => {
  test('reports content that replaced a loading skeleton', async ({ page }) => {
    await openSpa(page);
    await install(page);
    await goTo(page, '/checkout');

    const batch = await drain(page);

    expect(batch.fragments.join('')).toContain('<dialog');
    expect(batch.fragments.join('')).toContain('details');
  });

  // Whether chrome.devtools.network.onNavigated stays quiet cannot be seen from here. What can be
  // checked is that the batch carries the new address, which is what the panel attributes it to.
  test('attributes a batch to the route pushState moved to', async ({ page }) => {
    await openSpa(page);
    await install(page);
    await goTo(page, '/settings');

    const batch = await drain(page);

    expect(batch.route).toContain('/settings');
    expect(batch.fragments.join('')).toContain('popover');
  });

  test('keeps finding things across several routes in one session', async ({ page }) => {
    await openSpa(page);
    await install(page);

    const seen: string[] = [];

    for (const route of ['/checkout', '/settings', '/products']) {
      await goTo(page, route);
      seen.push((await drain(page)).fragments.join(''));
    }

    expect(seen[0]).toContain('<dialog');
    expect(seen[1]).toContain('popover');
    expect(seen[2]).toContain('Item 0');
  });

  test('reads a linked stylesheet itself, since devtools may hand back no body', async ({ page }) => {
    await page.route('**/late.css', async (route) => {
      await route.fulfill({ body: '.late { text-wrap: balance; }', contentType: 'text/css' });
    });
    await openSpa(page);
    await install(page);
    await page.evaluate(() => {
      const link = document.createElement('link');

      link.rel = 'stylesheet';
      link.href = '/late.css';

      document.head.append(link);
    });

    // A sheet crosses over on one drain only, so the poll has to keep what earlier drains handed it.
    const collected: Sheet[] = [];

    await expect.poll(async () => {
      collected.push(...(await drain(page)).stylesheets);

      return collected.length;
    }).toBeGreaterThan(0);

    expect(collected).toEqual([
      { url: new URL('/late.css', page.url()).href, text: '.late { text-wrap: balance; }' },
    ]);
  });

  test('fetches the map a stylesheet names, so a finding can point at the file it was written in', async ({ page }) => {
    const map = '{"version":3,"sources":["app.scss"],"names":[],"mappings":"AAAA"}';

    await page.route('**/mapped.css', async (route) => {
      await route.fulfill({
        body: '.mapped { text-wrap: balance; }\n/*# sourceMappingURL=mapped.css.map */',
        contentType: 'text/css',
      });
    });
    await page.route('**/mapped.css.map', async (route) => {
      await route.fulfill({ body: map, contentType: 'application/json' });
    });
    await openSpa(page);
    await install(page);
    await page.evaluate(() => {
      const link = document.createElement('link');

      link.rel = 'stylesheet';
      link.href = '/mapped.css';

      document.head.append(link);
    });

    const collected: Sheet[] = [];

    await expect.poll(async () => {
      collected.push(...(await drain(page)).stylesheets);

      return collected.length;
    }).toBeGreaterThan(0);

    expect(collected[0]?.map).toBe(map);
  });

  test('marks a named map it could not fetch, so the panel can say the position is poorer', async ({ page }) => {
    await page.route('**/broken.css', async (route) => {
      await route.fulfill({
        body: '.broken { text-wrap: balance; }\n/*# sourceMappingURL=broken.css.map */',
        contentType: 'text/css',
      });
    });
    await page.route('**/broken.css.map', async (route) => {
      await route.fulfill({ status: 404, body: 'not here' });
    });
    await openSpa(page);
    await install(page);
    await page.evaluate(() => {
      const link = document.createElement('link');

      link.rel = 'stylesheet';
      link.href = '/broken.css';

      document.head.append(link);
    });

    const collected: Sheet[] = [];

    await expect.poll(async () => {
      collected.push(...(await drain(page)).stylesheets);

      return collected.length;
    }).toBeGreaterThan(0);

    expect(collected[0]?.text).not.toBe('');
    expect(collected[0]?.map).toBe('');
  });

  test('records rules inserted without markup, rather than reading the page as clean', async ({ page }) => {
    await openSpa(page);
    await install(page);
    await page.evaluate(() => {
      const written = document.createElement('style');

      written.textContent = '.written { anchor-name: --pin; }';
      document.head.append(written);

      const inserted = document.createElement('style');

      document.head.append(inserted);
      inserted.sheet?.insertRule('.inserted { anchor-name: --pin; }', 0);
    });

    // One collection pass sees both blocks, so the first drain that reports any is already final.
    const collected: Sheet[] = [];

    await expect.poll(async () => {
      collected.push(...(await drain(page)).stylesheets);

      return collected.length;
    }).toBeGreaterThan(0);

    expect(collected).toHaveLength(1);
    expect(collected[0]?.text).toBe('');
  });

  test('counts what it could not keep up with rather than dropping it', async ({ page }) => {
    await openSpa(page);
    await install(page);
    await goTo(page, '/products');
    await drain(page);

    // Far past the 2000 element cap, so the overflow counter is the only place the rest can go.
    await page.evaluate(() => {
      const list = document.querySelector('ul');

      for (let index = 0; index < 2600; index += 1) {
        list?.append(document.createElement('li'));
      }
    });

    const batch = await drain(page);

    expect(batch.fragments.length).toBeGreaterThan(0);
    expect(batch.dropped).toBeGreaterThan(0);
  });
});
