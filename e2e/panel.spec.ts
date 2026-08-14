import { expect, test } from '@playwright/test';

const PREVIEW = '/preview.html';

test.describe('CompatLens panel', () => {
  test('reflows without horizontal scrolling at 360px with narrow filters', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 760 });
    await page.goto(PREVIEW);

    const scrollWidth = await page.locator('html').evaluate((element) => {
      return element.scrollWidth;
    });
    const clientWidth = await page.locator('html').evaluate((element) => {
      return element.clientWidth;
    });

    expect(scrollWidth).toBe(clientWidth);
  });

  test('opens and closes filters from the narrow toolbar', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 360, height: 760 });
    await page.goto(PREVIEW);

    const trigger = page.getByRole('button', { name: 'Open filters' });

    await expect(trigger).toBeVisible();
    await expect(page.getByRole('separator', { name: 'Resize the browser list' })).toBeHidden();
    await trigger.click();

    const dialog = page.getByRole('dialog', { name: 'Filters' });

    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Severity' })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Browsers' })).toBeVisible();

    const firstTransform = await dialog.evaluate((node) => {
      const animation = node.getAnimations()[0];

      if (!(animation instanceof CSSAnimation) || animation.animationName !== 'filter-menu') {
        return undefined;
      }

      for (const sheet of document.styleSheets) {
        for (const rule of sheet.cssRules) {
          if (rule instanceof CSSKeyframesRule && rule.name === animation.animationName) {
            const firstFrame = rule.cssRules[0];

            return firstFrame instanceof CSSKeyframeRule ? firstFrame.style.transform : undefined;
          }
        }
      }

      return undefined;
    });

    expect(firstTransform).toBe('translate(-100%)');

    await testInfo.attach('narrow-filter-menu', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });

    await page.keyboard.press('Escape');

    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveCSS('opacity', '1');
  });

  test('closes narrow filters when the viewport widens', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 760 });
    await page.goto(PREVIEW);
    await page.getByRole('button', { name: 'Open filters' }).click();

    const dialog = page.locator('#filter-menu');

    await expect(dialog).toHaveAttribute('open');
    await page.setViewportSize({ width: 720, height: 760 });
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('separator', { name: 'Resize the browser list' })).toBeFocused();

    await page.setViewportSize({ width: 360, height: 760 });
    await page.getByRole('button', { name: 'Open filters' }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveCSS('opacity', '1');
  });

  test('keeps permanent filters at desktop widths', async ({ page }) => {
    await page.setViewportSize({ width: 720, height: 760 });
    await page.goto(PREVIEW);

    await expect(page.getByRole('button', { name: 'Open filters' })).toBeHidden();
    await expect(page.getByRole('separator', { name: 'Resize the browser list' })).toBeVisible();
  });

  test('gives every checked browser its own column', async ({ page }) => {
    await page.goto(PREVIEW);

    await expect(page.getByText('anchor-name property').first()).toBeVisible();
    await expect(page.locator('th[data-column="chrome"]')).toBeVisible();
    await expect(page.locator('th[data-column="safari_ios"]')).toBeVisible();
    await expect(page.locator('th[data-group="Chromium Engine"]')).toHaveCount(1);
  });

  test('drags the browser list wider by its handle', async ({ page }) => {
    await page.goto(PREVIEW);

    const rail = page.getByRole('heading', { name: 'Browsers' }).locator('../..');
    const handle = page.getByRole('separator', { name: 'Resize the browser list' });
    const before = await rail.boundingBox();

    await handle.hover();
    await page.mouse.down();
    await page.mouse.move((before?.x ?? 0) + (before?.width ?? 0) + 80, before?.y ?? 0);
    await page.mouse.up();

    expect((await rail.boundingBox())?.width).toBeGreaterThan(before?.width ?? 0);
  });

  test('widens the browser list from the keyboard as well as the pointer', async ({ page }) => {
    await page.goto(PREVIEW);

    const rail = page.getByRole('heading', { name: 'Browsers' }).locator('../..');
    const before = await rail.boundingBox();

    await page.getByRole('separator', { name: 'Resize the browser list' }).focus();
    await page.keyboard.press('ArrowRight');

    expect((await rail.boundingBox())?.width).toBeGreaterThan(before?.width ?? 0);
  });

  test('opens the detail sheet over the grid without growing the page', async ({ page }) => {
    await page.setViewportSize({ width: 1120, height: 700 });
    await page.goto(PREVIEW);

    const gridHeight = () => {
      return page.locator('table').evaluate((table) => {
        return table.parentElement?.clientHeight ?? 0;
      });
    };
    const before = await gridHeight();

    await page.getByText('anchor-name property').first().click();

    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await page.evaluate(() => {
      return document.documentElement.scrollHeight <= document.documentElement.clientHeight;
    })).toBe(true);
    // An in-flow drawer would take this height from the grid; a sheet rises over it instead.
    expect(await gridHeight()).toBe(before);
  });

  test('selects the whole row, feature column included', async ({ page }) => {
    await page.goto(PREVIEW);
    await page.getByText('anchor-name property').first().click();

    const row = page.locator('tbody tr[data-selected="true"]');

    await expect(row).toHaveCount(1);
    await expect(row.locator('td[data-selected="true"]')).toHaveCount(1);
  });

  test('slides the sheet back down before it disappears', async ({ page }) => {
    await page.setViewportSize({ width: 1120, height: 700 });
    await page.goto(PREVIEW);
    await page.getByText('anchor-name property').first().click();

    const sheet = page.getByRole('dialog');

    await expect(sheet).toBeVisible();

    const leaving = await sheet.evaluate((node) => {
      const button = node.querySelector('button');

      if (button instanceof HTMLElement) {
        button.click();
      }

      return node.getAnimations().length;
    });

    await expect(sheet).toBeHidden();
    expect(leaving).toBeGreaterThan(0);
  });

  test('keeps the grid scrolling under the sheet rather than behind the page', async ({ page }) => {
    await page.setViewportSize({ width: 1120, height: 420 });
    await page.goto(PREVIEW);
    await page.getByText('anchor-name property').first().click();

    const sheet = page.getByRole('dialog');

    await sheet.evaluate(async (node) => {
      await Promise.all(node.getAnimations().map((animation) => {
        return animation.finished;
      }));
    });

    const scroller = page.locator('table').locator('..');
    const box = await sheet.boundingBox();

    await scroller.evaluate((node) => {
      node.scrollBy(0, 200);
    });

    expect(await scroller.evaluate((node) => {
      return node.scrollTop;
    })).toBeGreaterThan(0);
    expect((await sheet.boundingBox())?.y).toBe(box?.y);
  });

  test('keeps the feature column in place while the browsers scroll', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 760 });
    await page.goto(PREVIEW);

    const feature = page.getByRole('button', { name: 'Feature' });
    const before = await feature.boundingBox();

    const scrolled = await page.locator('table').evaluate((table) => {
      table.parentElement?.scrollBy(400, 0);

      return table.parentElement?.scrollLeft ?? 0;
    });

    expect(scrolled).toBeGreaterThan(0);
    expect((await feature.boundingBox())?.x).toBe(before?.x);
  });

  test('keeps the severity heading in place while the browsers scroll', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 760 });
    await page.goto(PREVIEW);

    const heading = page.locator('[data-section] span').first();
    const before = await heading.boundingBox();

    const scrolled = await page.locator('table').evaluate((table) => {
      table.parentElement?.scrollBy(400, 0);

      return table.parentElement?.scrollLeft ?? 0;
    });

    expect(scrolled).toBeGreaterThan(0);
    expect((await heading.boundingBox())?.x).toBe(before?.x);
  });

  test('names severity in words rather than colour alone', async ({ page }) => {
    await page.goto(PREVIEW);

    await expect(page.locator('[data-severity="breaks"]').first()).toBeVisible();
    await expect(page.locator('[data-severity="degrades"]').first()).toBeVisible();
  });

  test('marks a finding whose support could not be confirmed', async ({ page }) => {
    await page.goto(PREVIEW);

    await expect(page.locator('[data-unverified="true"]').first()).toBeVisible();
  });

  test('distinguishes a passing browser from one that arrives too late', async ({ page }) => {
    await page.goto(PREVIEW);

    await expect(page.locator('[data-state="supported"]').first()).toBeVisible();
    await expect(page.locator('[data-state="too-late"]').first()).toBeVisible();
  });

  test('explains what a cell means in words, not colour', async ({ page }) => {
    await page.goto(PREVIEW);

    const legend = page.locator('[data-legend]');

    await expect(legend).toHaveCount(3);
    await expect(legend.filter({ hasText: 'never' })).toContainText('Never shipped in this browser.');
  });

  test('opens a finding from the keyboard alone, and hands focus back on close', async ({ page }) => {
    await page.goto(PREVIEW);

    const first = page.locator('tbody tr button').first();

    await first.focus();
    await page.keyboard.press('Enter');

    const sheet = page.getByRole('dialog');

    await expect(sheet).toBeVisible();
    // Focus must land inside the sheet, or a screen reader is never told it opened.
    await expect(sheet.getByRole('button', { name: 'Close' })).toBeFocused();

    await page.keyboard.press('Enter');

    await expect(sheet).toBeHidden();
    await expect(first).toBeFocused();
  });

  test('scrolls a wide grid inside itself, never the page', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 760 });
    await page.goto(PREVIEW);

    const bodyOverflows = await page.locator('body').evaluate((element) => {
      return element.scrollWidth > element.clientWidth;
    });

    expect(bodyOverflows).toBe(false);
  });

  for (const theme of ['light', 'dark'] as const) {
    for (const width of [360, 1120] as const) {
      test(`screenshots ${theme} at ${String(width)}`, async ({ page }, testInfo) => {
        await page.emulateMedia({ colorScheme: theme });
        await page.setViewportSize({ width, height: 800 });
        await page.goto(PREVIEW);
        await expect(page.getByText('anchor-name property').first()).toBeVisible();

        await testInfo.attach(`${theme}-${String(width)}`, {
          body: await page.screenshot({ fullPage: true }),
          contentType: 'image/png',
        });
      });
    }
  }
});

test('offers exactly system, light and dark themes', async ({ page }) => {
  await page.goto('/preview.html');

  const options = page.getByLabel('Theme').locator('option');

  await expect(options).toHaveText(['System', 'Light', 'Dark']);
});

test('switches between findings and modernisations', async ({ page }) => {
  await page.goto('/preview.html');

  await expect(page.getByRole('tab', { name: /Findings/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: /Modernise/ })).toBeVisible();
});

test('moves between tabs with the keyboard', async ({ page }) => {
  await page.goto('/preview.html');

  await page.getByRole('tab', { name: /Findings/u }).focus();
  await page.keyboard.press('ArrowRight');

  const modernise = page.getByRole('tab', { name: /Modernise/u });

  await expect(modernise).toHaveAttribute('aria-selected', 'true');
  await expect(modernise).toBeFocused();
  await expect(modernise).toHaveAttribute('aria-controls', 'modernise-panel');
  await expect(page.getByRole('tabpanel', { name: /Modernise/u })).toBeVisible();
});
