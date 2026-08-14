import { afterEach } from 'vitest';

// The theme hook writes these on the document, which outlives a single test file.
afterEach(() => {
  const root = document.documentElement;

  delete root.dataset.theme;
  delete root.dataset.themeMode;
});
