import { type DefaultTreeAdapterTypes, parse } from 'parse5';

export interface PositionedElement {
  element: DefaultTreeAdapterTypes.Element;
  path: string;
}

const collect = ( // nth-of-type survives script inserting a different tag among the siblings.
  nodes: readonly DefaultTreeAdapterTypes.ChildNode[],
  parentPath: string,
  found: PositionedElement[],
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

    found.push({ element: node, path });

    // Shadow markup lives on template.content; the marker stops paths colliding with light DOM.
    if ('content' in node) {
      collect(node.content.childNodes, `${path}::shadow`, found);
    }

    collect(node.childNodes, path, found);
  }
};

// Parsed and walked once for both html detectors, so an element and a <style> block cannot disagree.
export const walkElements = (html: string): PositionedElement[] => {
  const found: PositionedElement[] = [];

  collect(parse(html, { sourceCodeLocationInfo: true }).childNodes, '', found);

  return found;
};
