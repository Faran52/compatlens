import { defineConfig, type Plugin } from 'vite';
import solid from 'vite-plugin-solid';

/**
 * Vite hardcodes crossorigin on every built <script type=module> and <link rel=stylesheet>, with
 * no config to turn it off. moz-extension:// resources carry no CORS headers, so Firefox drops
 * the crossorigin-mode stylesheet fetch silently: dist-firefox is a straight copy of dist (see
 * scripts/packageExtension.js), so this is the one place to strip it for both targets.
 */
const stripCrossorigin: Plugin = {
  name: 'strip-crossorigin',
  transformIndexHtml: (html) => {
    return html.replace(/ crossorigin(="[^"]*")?/g, '');
  },
};

// Chrome resolves devtools_page and the panel page against the extension root, so both HTML
// entries stay flat and asset names carry no content hash: a reviewer diffs the built output.
export default defineConfig(({ mode }) => {
  const preview = mode === 'preview';

  return {
    plugins: [
      solid(),
      stripCrossorigin,
    ],
    resolve: { tsconfigPaths: true },
    // The worker is emitted by its own rollup pass, which hashes unless it is told the same rule.
    worker: {
      format: 'es',
      rollupOptions: { output: { entryFileNames: 'assets/[name].js' } },
    },
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
