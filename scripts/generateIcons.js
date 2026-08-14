import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

// Five hand-drawn rasters drift out of sync; one SVG plus a render step cannot.
const SIZES = [16, 32, 48, 128];

const here = dirname(fileURLToPath(import.meta.url));

// The source sits beside this script, not in public/, so a build input never ships in the archive.
const source = join(here, 'icon.svg');

const iconsDir = join(here, '..', 'public', 'icons');

await mkdir(iconsDir, { recursive: true });

for (const size of SIZES) {
  await sharp(source, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true })
    .toFile(join(iconsDir, `icon-${size}.png`));
}

// The DevTools panel icon is the 32 px mark. Copying keeps the two byte-identical.
await copyFile(join(iconsDir, 'icon-32.png'), join(iconsDir, 'panel-32.png'));

console.log(`Rendered ${SIZES.length} icons plus panel-32.png from icon.svg`);
