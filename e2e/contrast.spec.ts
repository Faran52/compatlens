import { expect, test } from '@playwright/test';

interface Measurement {
  label: string;
  ratio: number;
  rendered: boolean;
}

// WCAG 2.2 1.4.3 wants 4.5:1 for body-size text. Every token below renders at 12px or larger.
const MINIMUM_TEXT_RATIO = 4.5;

// Selected by data hook, not class name, so a restyle cannot silently stop measuring anything.
const TEXT_TOKENS: readonly (readonly [string, string])[] = [
  ['breaks severity', '[data-severity="breaks"]'],
  ['degrades severity', '[data-severity="degrades"]'],
  ['unverified mark', '[data-unverified="true"]'],
  ['supported cell', '[data-state="supported"]'],
  ['too-late cell', '[data-state="too-late"]'],
  ['never cell', '[data-state="never"]'],
];

const luminance = (colour: string): number => {
  const parts = /rgba?\((\d+),\s*(\d+),\s*(\d+)/u.exec(colour);

  if (!parts) {
    return 0;
  }

  const channels = [parts[1], parts[2], parts[3]].map((value) => {
    const scaled = Number(value) / 255;

    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  });

  // Destructured with defaults: the three come from one `map` over a fixed-length match, which the index type
  // cannot see.
  const [red = 0, green = 0, blue = 0] = channels;

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

for (const scheme of ['light', 'dark'] as const) {
  test(`every text token meets WCAG AA in ${scheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/preview.html');
    await expect(page.getByText('anchor-name property').first()).toBeVisible();

    const measurements: Measurement[] = [];

    for (const [label, selector] of TEXT_TOKENS) {
      const element = page.locator(selector).first();

      if (await element.count() === 0) {
        measurements.push({ label, ratio: 0, rendered: false });
        continue;
      }

      const colours = await element.evaluate((node) => {
        const style = getComputedStyle(node);
        let background = style.backgroundColor;
        let parent = node.parentElement;

        while (parent && (background === 'rgba(0, 0, 0, 0)' || background === 'transparent')) {
          background = getComputedStyle(parent).backgroundColor;
          parent = parent.parentElement;
        }

        return { foreground: style.color, background };
      });

      const first = luminance(colours.foreground);
      const second = luminance(colours.background);
      const ratio = (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);

      measurements.push({ label, ratio, rendered: true });
    }

    const missing = measurements.filter((measurement) => {
      return !measurement.rendered;
    });

    expect(missing, `tokens that never rendered: ${missing.map((m) => {
      return m.label;
    }).join(', ')}`)
      .toEqual([]);

    const failing = measurements.filter((measurement) => {
      return measurement.ratio < MINIMUM_TEXT_RATIO;
    });

    expect(
      failing,
      failing.map((m) => {
        return `${m.label} ${m.ratio.toFixed(2)}:1`;
      }).join('; '),
    ).toEqual([]);
  });
}
