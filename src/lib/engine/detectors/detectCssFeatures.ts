import postcss, {
  type Declaration,
  type Node as PostcssNode,
  type Rule,
} from 'postcss';
import selectorParser from 'postcss-selector-parser';
import valueParser from 'postcss-value-parser';

import { stripQuery } from '../utils/urlUtils';

import type {
  DetectedFeature,
  ResourceInput,
  SourceLocation,
  SyntaxDefinition,
} from '../types';

interface SyntaxIndex {
  atRules: Map<string, string>;
  selectors: Map<string, string>;
  properties: Map<string, string>;
  values: Map<string, string>;
}

const NESTING_SYNTAX = '&';

const normalizeSyntax = (syntax: string): string => { // the catalog writes ":has("; the AST node carries the bare name.
  if (syntax.endsWith('(')) {
    return syntax.slice(0, -1);
  }

  return syntax;
};

const buildIndex = (definitions: readonly SyntaxDefinition[]): SyntaxIndex => {
  const index: SyntaxIndex = {
    atRules: new Map(),
    selectors: new Map(),
    properties: new Map(),
    values: new Map(),
  };

  for (const entry of definitions) {
    const key = normalizeSyntax(entry.syntax);

    if (entry.kind === 'css-at-rule') {
      index.atRules.set(key, entry.id);
    }

    if (entry.kind === 'css-selector') {
      index.selectors.set(key, entry.id);
    }

    if (entry.kind === 'css-property') {
      index.properties.set(key, entry.id);
    }

    if (entry.kind === 'css-value') {
      index.values.set(key, entry.id);
    }
  }

  return index;
};

const locationOf = (url: string, node: PostcssNode): SourceLocation => {
  const start = node.source?.start;

  /* v8 ignore next 3 -- postcss always positions nodes parsed from a string. */
  if (!start) {
    return { url };
  }

  return { url, line: start.line, column: start.column };
};

const collectSelectorFeatures = (
  rule: Rule,
  index: SyntaxIndex,
  url: string,
): DetectedFeature[] => {
  const detections: DetectedFeature[] = [];
  const seen = new Set<string>();

  const record = (featureId: string | undefined): void => {
    if (featureId === undefined || seen.has(featureId)) {
      return;
    }

    seen.add(featureId);
    detections.push({ featureId, location: locationOf(url, rule) });
  };

  if (rule.parent?.type === 'rule') { // a rule nested inside another rule is nesting whether or not it spells out "&".
    record(index.selectors.get(NESTING_SYNTAX));
  }

  selectorParser((selectors) => {
    selectors.walk((node) => {
      if (node.type === 'nesting') {
        record(index.selectors.get(NESTING_SYNTAX));
      }

      if (node.type === 'pseudo') {
        record(index.selectors.get(node.value));
      }
    });
  }).processSync(rule.selector);

  return detections;
};

const collectDeclarationFeatures = (
  declaration: Declaration,
  index: SyntaxIndex,
  url: string,
): DetectedFeature[] => {
  const detections: DetectedFeature[] = [];
  const location = locationOf(url, declaration);
  const propertyFeature = index.properties.get(declaration.prop);

  if (propertyFeature !== undefined) {
    detections.push({ featureId: propertyFeature, location });
  }

  const seen = new Set<string>();

  valueParser(declaration.value).walk((node) => {
    if (node.type !== 'function' && node.type !== 'word') {
      return;
    }

    const featureId = index.values.get(node.value);

    if (featureId === undefined || seen.has(featureId)) {
      return;
    }

    seen.add(featureId);
    detections.push({ featureId, location });
  });

  return detections;
};

export const detectCssFeatures = ( // throws CssSyntaxError; analyzeResources catches per resource.
  resource: ResourceInput,
  definitions: readonly SyntaxDefinition[],
): DetectedFeature[] => {
  const index = buildIndex(definitions);
  const detections: DetectedFeature[] = [];
  // postcss quotes `from` back in its syntax errors, and those errors reach the panel.
  const root = postcss.parse(resource.content, { from: stripQuery(resource.url) });

  root.walk((node) => {
    if (node.type === 'atrule') {
      const featureId = index.atRules.get(node.name);

      if (featureId !== undefined) {
        detections.push({ featureId, location: locationOf(resource.url, node) });
      }
    }

    if (node.type === 'rule') {
      detections.push(...collectSelectorFeatures(node, index, resource.url));
    }

    if (node.type === 'decl') {
      detections.push(...collectDeclarationFeatures(node, index, resource.url));
    }
  });

  return detections;
};
