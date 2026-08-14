import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

// Chrome resolves devtools_page and the panel page against the extension root, so both HTML
// entries stay flat and asset names carry no content hash: a reviewer diffs the built output.
export default defineConfig(({ mode }) => {
  const preview = mode === 'preview';

  return {
    plugins: [
      solid(),
    ],
    resolve: { tsconfigPaths: true },
    // Relative asset URLs: the panel and devtools pages load from chrome-extension://<id>/, and a
    // root-absolute src would break the moment either page moves out of the archive root.
    base: './',
    build: {
      outDir: preview ? 'dist-preview' : 'dist',
      emptyOutDir: true,
      modulePreload: false,
      // The panel is loaded from disk by Chrome, never fetched, so a single larger chunk costs
      // nothing. postcss, parse5 and the generated registry account for most of it.
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        // The fixture page is an input only in preview mode, so a production build cannot contain
        // the fixture host even by accident. pnpm package asserts that too. A list rather than a
        // keyed object: an object with an optional key is not assignable to rollup's InputOption.
        input: preview
          ? ['devtools.html', 'panel.html', 'preview.html']
          : ['devtools.html', 'panel.html'],
        output: {
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name][extname]',
        },
      },
    },
  };
});
