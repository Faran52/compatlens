import type { DefaultTreeAdapterTypes } from 'parse5';
import type {
  DetectedFeature,
  SourceLocation,
  SyntaxDefinition,
} from '../types';
import type { PositionedElement } from './walkElements';

interface HtmlSyntaxIndex {
  elements: Map<string, string>;
  globalAttributes: Map<string, string>;
  scopedAttributes: Map<string, string>;
}

// "details[name]" scopes to one element; a bare "name" would match every form control.
const ATTRIBUTE_SYNTAX = /^([a-z0-9-]*)\[([a-z-]+)\]$/;

const buildIndex = (definitions: readonly SyntaxDefinition[]): HtmlSyntaxIndex => {
  const index: HtmlSyntaxIndex = {
    elements: new Map(),
    globalAttributes: new Map(),
    scopedAttributes: new Map(),
  };

  for (const entry of definitions) {
    if (entry.kind === 'html-element') {
      index.elements.set(entry.syntax, entry.id);
      continue;
    }

    if (entry.kind !== 'html-attribute') {
      continue;
    }

    const parsed = ATTRIBUTE_SYNTAX.exec(entry.syntax);
    const element = parsed?.[1];
    const attribute = parsed?.[2];

    if (element === undefined || attribute === undefined) {
      continue;
    }

    if (element === '') {
      index.globalAttributes.set(attribute, entry.id);
      continue;
    }

    index.scopedAttributes.set(`${element}[${attribute}]`, entry.id);
  }

  return index;
};

const collectElementFeatures = (
  element: DefaultTreeAdapterTypes.Element,
  index: HtmlSyntaxIndex,
  url: string,
  path: string,
): DetectedFeature[] => {
  const detections: DetectedFeature[] = [];
  const elementLocation = element.sourceCodeLocation;
  const at = (line: number | undefined, column: number | undefined): SourceLocation => {
    if (line === undefined || column === undefined) {
      return { url, path };
    }

    return {
      url,
      line,
      column,
      path,
    };
  };

  const elementFeature = index.elements.get(element.tagName);

  if (elementFeature !== undefined) {
    detections.push({
      featureId: elementFeature,
      location: at(elementLocation?.startLine, elementLocation?.startCol),
    });
  }

  for (const attribute of element.attrs) {
    const scoped = index.scopedAttributes.get(`${element.tagName}[${attribute.name}]`);
    const featureId = scoped ?? index.globalAttributes.get(attribute.name);

    if (featureId === undefined) {
      continue;
    }

    const attributeLocation = elementLocation?.attrs?.[attribute.name];

    detections.push({
      featureId,
      location: at(attributeLocation?.startLine, attributeLocation?.startCol),
    });
  }

  return detections;
};

export const detectHtmlFeatures = ( // reads element and attribute names only, never values or text.
  elements: readonly PositionedElement[],
  url: string,
  definitions: readonly SyntaxDefinition[],
): DetectedFeature[] => {
  const index = buildIndex(definitions);

  return elements.flatMap((found) => {
    return collectElementFeatures(found.element, index, url, found.path);
  });
};
