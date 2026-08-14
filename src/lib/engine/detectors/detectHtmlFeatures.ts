import { type DefaultTreeAdapterTypes, parse } from 'parse5';

import type {
  DetectedFeature,
  ResourceInput,
  SourceLocation,
  SyntaxDefinition,
} from '../types';

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

const walkChildren = ( // nth-of-type survives script inserting a different tag among the siblings.
  nodes: readonly DefaultTreeAdapterTypes.ChildNode[],
  index: HtmlSyntaxIndex,
  url: string,
  parentPath: string,
): DetectedFeature[] => {
  const detections: DetectedFeature[] = [];
  const seenTags = new Map<string, number>();

  for (const node of nodes) {
    if (!('tagName' in node)) {
      continue;
    }

    const position = (seenTags.get(node.tagName) ?? 0) + 1;

    seenTags.set(node.tagName, position);

    const path = `${parentPath}${parentPath === '' ? '' : '>'}`
      + `${node.tagName}:nth-of-type(${String(position)})`;

    detections.push(...collectElementFeatures(node, index, url, path));

    // Shadow markup lives on template.content; the marker stops paths colliding with light DOM.
    if ('content' in node) {
      detections.push(...walkChildren(node.content.childNodes, index, url, `${path}::shadow`));
    }

    detections.push(...walkChildren(node.childNodes, index, url, path));
  }

  return detections;
};

export const detectHtmlFeatures = ( // reads element and attribute names only, never values or text.
  resource: ResourceInput,
  definitions: readonly SyntaxDefinition[],
): DetectedFeature[] => {
  const document = parse(resource.content, { sourceCodeLocationInfo: true });

  return walkChildren(document.childNodes, buildIndex(definitions), resource.url, '');
};
