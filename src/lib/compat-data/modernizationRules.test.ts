import {
  describe,
  expect,
  it,
} from 'vitest';

import { curatedDetectors } from './curatedDetectors';
import { modernizationRules } from './modernizationRules';

describe('modernizationRules', () => {
  it('names a curated detector as every replacement', () => {
    const ids = new Set(curatedDetectors.map((detector) => {
      return detector.id;
    }));

    for (const rule of modernizationRules) {
      expect(ids.has(rule.replacementId)).toBe(true);
    }
  });

  it('gives every rule a unique id', () => {
    const ids = modernizationRules.map((rule) => {
      return rule.id;
    });

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never collides with a curated detector id', () => {
    const detectorIds = new Set(curatedDetectors.map((detector) => {
      return detector.id;
    }));

    for (const rule of modernizationRules) {
      expect(detectorIds.has(rule.id)).toBe(false);
    }
  });

  it('matches the replacement kind so the same index can find both', () => {
    const kindsById = new Map(curatedDetectors.map((detector) => {
      return [detector.id, detector.kind];
    }));

    for (const rule of modernizationRules) {
      expect(rule.kind).toBe(kindsById.get(rule.replacementId));
    }
  });

  it('only describes legacy syntax, never the modern spelling it replaces', () => {
    const syntaxById = new Map(curatedDetectors.map((detector) => {
      return [detector.id, detector.syntax];
    }));

    for (const rule of modernizationRules) {
      expect(rule.syntax).not.toBe(syntaxById.get(rule.replacementId));
    }
  });

  it('ends every piece of advice as a sentence', () => {
    for (const rule of modernizationRules) {
      expect(rule.advice.endsWith('.')).toBe(true);
    }
  });
});
