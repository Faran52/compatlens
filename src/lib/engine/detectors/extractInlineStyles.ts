import { type DefaultTreeAdapterTypes, parse } from 'parse5';

import type { ResourceInput } from '../types';

export interface InlineStyle {
  content: string;
  startLine: number;
  path: string;
}

// parse5 parses <style> as raw text, so its children are always text nodes.
const styleTextOf = (element: DefaultTreeAdapterTypes.Element): string => {
  return element.childNodes
    .map((node) => {
      /* v8 ignore next -- a non-text child of <style> is unreachable. */
      return 'value' in node ? node.value : '';
    })
    .join('');
};

// Same nth-of-type scheme the html detector walks, so a block and an element agree on where they are.
const collect = (
  nodes: readonly DefaultTreeAdapterTypes.ChildNode[],
  found: InlineStyle[],
  parentPath: string,
): void => {
  const seenTags = new Map<string, number>();

  for (const node of nodes) {
    if (!('tagName' in node)) {
      continue;
    }

    const position = (seenTags.get(node.tagName) ?? 0) + 1;

    seenTags.set(node.tagName, position);

    const path = `${parentPath}${parentPath === '' ? '' : '>'}`
      + `${node.tagName}:nth-of-type(${String(position)})`;

    if (node.tagName === 'style') {
      const content = styleTextOf(node);

      if (content.trim() !== '') {
        found.push({
          content,
          /* v8 ignore next -- <style> is never implied, so it always has a start tag. */
          startLine: node.sourceCodeLocation?.startTag?.endLine ?? 1,
          path,
        });
      }
    }

    if ('content' in node) {
      collect(node.content.childNodes, found, `${path}::shadow`);
    }

    collect(node.childNodes, found, path);
  }
};

export const extractInlineStyles = (resource: ResourceInput): InlineStyle[] => {
  const document = parse(resource.content, { sourceCodeLocationInfo: true });
  const found: InlineStyle[] = [];

  collect(document.childNodes, found, '');

  return found;
};
