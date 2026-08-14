import {
  describe,
  expect,
  it,
} from 'vitest';

import { createAnalysedResources } from './analysedResources';

import type { ResourceInput } from '@engine';

const css = (url: string, content: string, sourceMap?: string): ResourceInput => {
  return sourceMap === undefined
    ? { kind: 'css', url, content }
    : { kind: 'css', url, content, sourceMap };
};

const markup = (content: string): ResourceInput => {
  return { kind: 'html', url: 'https://x.test/', content, view: 'rendered' };
};

const urls = (resources: readonly ResourceInput[]): string[] => {
  return resources.map((resource) => {
    return resource.url;
  });
};

describe('createAnalysedResources', () => {
  it('passes a stylesheet through the first time it is seen', () => {
    const analysed = createAnalysedResources();

    expect(urls(analysed.unanalysed([css('/a.css', '.a { color: red; }')]))).toEqual(['/a.css']);
  });

  it('drops a stylesheet whose body has not changed since it was analysed', () => {
    const analysed = createAnalysedResources();
    const sheet = css('/a.css', '.a { color: red; }');

    analysed.record([sheet]);

    expect(analysed.unanalysed([sheet])).toEqual([]);
  });

  it('keeps offering a stylesheet that was selected but never recorded', () => {
    const analysed = createAnalysedResources();
    const sheet = css('/a.css', '.a { color: red; }');

    analysed.unanalysed([sheet]);

    expect(analysed.unanalysed([sheet])).toEqual([sheet]);
  });

  it('passes a stylesheet through again once its body changes', () => {
    const analysed = createAnalysedResources();

    analysed.record([css('/a.css', '.a { color: red; }')]);

    expect(urls(analysed.unanalysed([css('/a.css', '.a { color: blue; }')]))).toEqual(['/a.css']);
  });

  it('passes an unchanged body through again once the map it names has caught up', () => {
    const analysed = createAnalysedResources();
    const body = '.a { color: red; }';

    analysed.record([css('/a.css', body)]);

    expect(analysed.unanalysed([css('/a.css', body, '{"version":3}')])).toHaveLength(1);
  });

  it('drops a stylesheet whose body and map are both unchanged', () => {
    const analysed = createAnalysedResources();
    const mapped = css('/a.css', '.a { color: red; }', '{"version":3}');

    analysed.record([mapped]);

    expect(analysed.unanalysed([mapped])).toEqual([]);
  });

  it('keeps stylesheets apart by address, so one cannot mask another', () => {
    const analysed = createAnalysedResources();
    const body = '.a { color: red; }';

    analysed.record([css('/a.css', body)]);

    expect(urls(analysed.unanalysed([css('/b.css', body)]))).toEqual(['/b.css']);
  });

  it('never drops markup, since a repeated fragment is a fresh mutation', () => {
    const analysed = createAnalysedResources();
    const fragment = markup('<dialog></dialog>');

    analysed.record([fragment]);

    expect(analysed.unanalysed([fragment])).toEqual([fragment]);
  });

  it('judges every stylesheet again after the target changes', () => {
    const analysed = createAnalysedResources();
    const sheet = css('/a.css', '.a { color: red; }');

    analysed.record([sheet]);
    analysed.forget();

    expect(analysed.unanalysed([sheet])).toEqual([sheet]);
  });
});
