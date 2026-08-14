import {
  describe,
  expect,
  it,
} from 'vitest';

import packageJson from '../../../package.json' with { type: 'json' };

import { curatedDetectors } from './curatedDetectors';
import { featureRegistry } from './generatedRegistry';

import type { DetectorKind } from '@engine';

const PINNED = {
  bcd: packageJson.devDependencies['@mdn/browser-compat-data'],
  webFeatures: packageJson.devDependencies['web-features'],
};

const KIND_PREFIX = new Map<DetectorKind, string>([
  ['html-element', 'html-'],
  ['html-attribute', 'html-'],
  ['css-property', 'css-'],
  ['css-selector', 'css-'],
  ['css-at-rule', 'css-'],
  ['css-value', 'css-'],
]);

describe('curatedDetectors', () => {
  it('covers the full detector catalog', () => {
    expect(curatedDetectors).toHaveLength(34);
  });

  it('gives every detector a unique id', () => {
    const ids = curatedDetectors.map((detector) => {
      return detector.id;
    });

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('prefixes every detector id with the language its kind belongs to', () => {
    const mismatched = curatedDetectors.filter((detector) => {
      return !detector.id.startsWith(KIND_PREFIX.get(detector.kind) ?? '');
    });

    expect(mismatched).toEqual([]);
  });

  it('writes attribute syntax as element[attribute] so bare names cannot match every element', () => {
    const attributeSyntax = curatedDetectors
      .filter((detector) => {
        return detector.kind === 'html-attribute';
      })
      .map((detector) => {
        return detector.syntax;
      });

    expect(attributeSyntax.every((syntax) => {
      return syntax.endsWith(']') && syntax.includes('[');
    })).toBe(true);
  });

  it('declares at-rule syntax without the at sign', () => {
    const atRuleSyntax = curatedDetectors
      .filter((detector) => {
        return detector.kind === 'css-at-rule';
      })
      .map((detector) => {
        return detector.syntax;
      });

    expect(atRuleSyntax.some((syntax) => {
      return syntax.startsWith('@');
    })).toBe(false);
  });

  it('gives every detector actionable fallback guidance', () => {
    const weak = curatedDetectors.filter((detector) => {
      return detector.fallback.length < 40 || !detector.fallback.endsWith('.');
    });

    expect(weak).toEqual([]);
  });

  it('resolves every curated detector into the generated registry', () => {
    const registryIds = featureRegistry.map((entry) => {
      return entry.id;
    });
    const curatedIds = curatedDetectors
      .map((detector) => {
        return detector.id;
      })
      .sort((left, right) => {
        return left.localeCompare(right);
      });

    expect(registryIds).toEqual(curatedIds);
  });

  it('records the pinned dataset versions on every registry entry', () => {
    const versions = new Set(featureRegistry.map((entry) => {
      return `${entry.dataVersion.bcd}/${entry.dataVersion.webFeatures}`;
    }));

    expect([...versions]).toEqual([`${PINNED.bcd}/${PINNED.webFeatures}`]);
  });
});
