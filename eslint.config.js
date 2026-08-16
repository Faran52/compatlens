import { defineConfig } from '@linteljs/eslint-config/define-config';

const config = await defineConfig({
  framework: 'solid',
  typescript: true,
  vitest: true,
  html: true,
  libraries: ['tailwind'],
  tailwindEntryPoint: './src/style.css',
  ignores: [
    'dist/**',
    'coverage/**',
    '.claude/**',
    '.agents/**',
    'plugins/linteljs/**',
    'src/lib/compat-data/generatedRegistry.ts',
    'e2e/fixtures/**',
  ],
  aliases: {
    '@components/*': './src/components/*',
    '@ui/*': './src/components/ui/*',
    '@features/*': './src/components/features/*',
    '@lib/*': './src/lib/*',
    '@utils/*': './src/lib/utils/*',
    '@services/*': './src/lib/services/*',
    '@model/*': './src/lib/model/*',
    '@config/*': './src/config/*',
    '@mocks/*': './__mocks__/*',
    '@compat-data': './src/lib/compat-data/index.ts',
    '@components/features': './src/components/features/index.ts',
    '@components/ui': './src/components/ui/index.ts',
    '@engine': './src/lib/engine/index.ts',
    '@extension': './src/extension/index.ts',
    '@mocks': './__mocks__/index.ts',
    '@model': './src/model/index.ts',
    '@utils': './src/utils/index.ts',
    '@workers': './src/workers/index.ts',
  },
  naming: {
    'src/**/*.tsx': '!([a-z]*[A-Z]*)',
    'src/**/!(*.d|*.test|*.spec).ts': 'CAMEL_CASE',
    'src/**/*.d.ts': '@(+([a-z0-9])*(-+([a-z0-9]))|+([a-z])*([a-zA-Z0-9]))',
  },
  folderNaming: {
    'src/**/': '@(+([a-z0-9])*(-+([a-z0-9]))|__tests__)',
  },
});

// wireSheetDismissal only ever hands its callback to addEventListener, one call removed from the
// component; the rule can't see through that indirection, so it reads as reactivity with no
// tracked scope around it.
config.push({
  files: ['src/components/ui/sheet/**/*.tsx'],
  rules: {
    'solid/reactivity': ['warn', { customReactiveFunctions: ['wireSheetDismissal'] }],
  },
});

export default config;
