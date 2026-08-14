import type { DefaultTreeAdapterTypes } from 'parse5';
import type { PositionedElement } from './walkElements';

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

export const extractInlineStyles = (
  elements: readonly PositionedElement[],
): InlineStyle[] => {
  return elements.flatMap((found) => {
    if (found.element.tagName !== 'style') {
      return [];
    }

    const content = styleTextOf(found.element);

    if (content.trim() === '') {
      return [];
    }

    return [{
      content,
      /* v8 ignore next -- <style> is never implied, so it always has a start tag. */
      startLine: found.element.sourceCodeLocation?.startTag?.endLine ?? 1,
      path: found.path,
    }];
  });
};
