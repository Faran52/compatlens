import {
  cp,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import {
  dirname,
  join,
  relative,
} from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateRawSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');
const firefoxDistDir = join(root, 'dist-firefox');
const artifactsDir = join(root, 'artifacts');

// One build, two manifests. Chrome rejects browser_specific_settings; AMO needs the gecko id.
// Chrome's is read from dist, not public, so docs/privacy.md's claim is checked against what ships.
const TARGETS = [
  { name: 'chrome', manifest: join(distDir, 'manifest.json'), suffix: '' },
  { name: 'firefox', manifest: join(root, 'manifest.firefox.json'), suffix: '-firefox' },
];

const firefoxTarget = TARGETS.find((target) => {
  return target.name === 'firefox';
});

// The fixture host must never reach a shipped build. The preview page is the only thing that
// carries it and it is not a build input outside `--mode preview`, but the check is nearly free.
const FORBIDDEN = ['shop.example.test', 'preview.html'];

const REQUIRED = [
  'manifest.json',
  'devtools.html',
  'panel.html',
  'icons/icon-16.png',
  'icons/icon-32.png',
  'icons/icon-48.png',
  'icons/icon-128.png',
  'icons/panel-32.png',
];

// A fixed 1980-01-01 stamp: real mtimes would make every run produce a different archive.
const DOS_TIME = 0;
const DOS_DATE = 0x0021;

const fail = (message) => {
  console.error(`pnpm package: ${message}`);
  process.exit(1);
};

const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
      continue;
    }

    files.push(full);
  }

  return files.sort();
};

const localHeader = (entry) => {
  const header = Buffer.alloc(30);

  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(8, 8);
  header.writeUInt16LE(DOS_TIME, 10);
  header.writeUInt16LE(DOS_DATE, 12);
  header.writeUInt32LE(entry.crc, 14);
  header.writeUInt32LE(entry.compressed.length, 18);
  header.writeUInt32LE(entry.size, 22);
  header.writeUInt16LE(entry.name.length, 26);
  header.writeUInt16LE(0, 28);

  return Buffer.concat([header, Buffer.from(entry.name, 'utf8')]);
};

const centralHeader = (entry) => {
  const header = Buffer.alloc(46);

  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(8, 10);
  header.writeUInt16LE(DOS_TIME, 12);
  header.writeUInt16LE(DOS_DATE, 14);
  header.writeUInt32LE(entry.crc, 16);
  header.writeUInt32LE(entry.compressed.length, 20);
  header.writeUInt32LE(entry.size, 24);
  header.writeUInt16LE(entry.name.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(entry.offset, 42);

  return Buffer.concat([header, Buffer.from(entry.name, 'utf8')]);
};

const buildArchive = (entries) => {
  const locals = [];
  let offset = 0;

  for (const entry of entries) {
    entry.offset = offset;

    const local = localHeader(entry);

    locals.push(local, entry.compressed);
    offset += local.length + entry.compressed.length;
  }

  const centrals = entries.map(centralHeader);
  const centralSize = centrals.reduce((total, buffer) => {
    return total + buffer.length;
  }, 0);
  const end = Buffer.alloc(22);

  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, ...centrals, end]);
};

const files = await walk(distDir);
const relativeFiles = files.map((file) => {
  return relative(distDir, file);
});

for (const required of REQUIRED) {
  if (!relativeFiles.includes(required)) {
    fail(`built output is missing ${required}. Run pnpm build first.`);
  }
}

const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));

const checkManifest = (target, manifest) => {
  if (manifest.version !== pkg.version) {
    fail(`${target.name} manifest is ${manifest.version} but package.json is ${pkg.version}`);
  }

  if (manifest.manifest_version !== 3) {
    fail(`${target.name} manifest_version must be 3`);
  }

  if (manifest.permissions !== undefined) {
    fail(`${target.name} manifest requests ${JSON.stringify(manifest.permissions)}; `
      + 'it needs no permissions at all');
  }

  if (manifest.host_permissions !== undefined) {
    fail(`${target.name} manifest must not request host permissions`);
  }

  // AMO ties the listing to this id forever, so a build without one would be unpublishable.
  if (target.name === 'firefox' && !manifest.browser_specific_settings?.gecko?.id) {
    fail('firefox manifest needs browser_specific_settings.gecko.id');
  }

  // Without a floor an older Chrome installs the panel and renders colours its css cannot mix.
  if (target.name === 'chrome' && manifest.minimum_chrome_version === undefined) {
    fail('chrome manifest must declare minimum_chrome_version');
  }

  // Chrome rejects the whole package rather than ignoring a key it does not know.
  if (target.name === 'chrome' && manifest.browser_specific_settings !== undefined) {
    fail('chrome manifest must not carry browser_specific_settings');
  }
};

const scan = (name, contents) => {
  if (!/\.(?:js|html|json|css|svg)$/.test(name)) {
    return;
  }

  const text = contents.toString('utf8');

  for (const needle of FORBIDDEN) {
    if (text.includes(needle)) {
      fail(`${name} contains "${needle}"`);
    }
  }
};

const toEntry = (name, contents) => {
  scan(name, contents);

  return {
    name,
    size: contents.length,
    crc: crc32(contents),
    compressed: deflateRawSync(contents, { level: 9 }),
    offset: 0,
  };
};

// The manifest is the only file that differs between targets, so the rest is compressed once.
const shared = [];

for (const file of files) {
  const name = relative(distDir, file).split('\\').join('/');

  if (name === 'manifest.json') {
    continue;
  }

  shared.push(toEntry(name, await readFile(file)));
}

await rm(artifactsDir, { recursive: true, force: true });
await mkdir(artifactsDir, { recursive: true });

for (const target of TARGETS) {
  const contents = await readFile(target.manifest);

  checkManifest(target, JSON.parse(contents.toString('utf8')));

  const entries = [...shared, toEntry('manifest.json', contents)]
    .sort((left, right) => {
      return left.name < right.name ? -1 : 1;
    });
  const archive = join(artifactsDir, `compatlens${target.suffix}-${pkg.version}.zip`);

  await writeFile(archive, buildArchive(entries));

  console.log(`Packaged ${String(entries.length)} files into ${relative(root, archive)}`);
}

// web-ext signs a directory, and this is also what you load unpacked in Firefox.
await rm(firefoxDistDir, { recursive: true, force: true });
await cp(distDir, firefoxDistDir, { recursive: true });
await cp(firefoxTarget.manifest, join(firefoxDistDir, 'manifest.json'));

console.log(`Wrote ${relative(root, firefoxDistDir)} for signing and unpacked loading`);
