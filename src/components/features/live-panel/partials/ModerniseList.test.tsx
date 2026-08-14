import { render, screen } from '@solidjs/testing-library';
import {
  describe,
  expect,
  it,
} from 'vitest';

import { ModerniseList } from './ModerniseList';

import type { Suggestion } from '@engine';

const suggestion = (overrides: Partial<Suggestion> = {}): Suggestion => {
  return {
    id: 'legacy-webkit-appearance@app.css:83',
    ruleId: 'legacy-webkit-appearance',
    syntax: '-webkit-appearance',
    advice: 'Drop the prefix and use appearance.',
    name: 'appearance property',
    replacementSyntax: 'appearance',
    mdnUrl: 'https://developer.mozilla.org/appearance',
    baselineDate: '2024-09-14',
    location: { url: 'https://shop.example.test/app.css', line: 83 },
    ...overrides,
  };
};

describe('ModerniseList', () => {
  it('says there is nothing to modernise rather than showing an empty box', () => {
    render(() => {
      return <ModerniseList suggestions={[]} targeted={7} />;
    });

    expect(screen.getByText(/Nothing to modernise/u)).toBeInstanceOf(HTMLElement);
  });

  it('says why every suggestion is safe for this target', () => {
    render(() => {
      return <ModerniseList suggestions={[suggestion()]} targeted={7} />;
    });

    expect(screen.getByText(/already works on all 7 browsers you target/u))
      .toBeInstanceOf(HTMLElement);
  });

  it('names the legacy syntax and its replacement', () => {
    render(() => {
      return <ModerniseList suggestions={[suggestion()]} targeted={7} />;
    });

    expect(screen.getByText('-webkit-appearance')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('appearance')).toBeInstanceOf(HTMLElement);
  });

  it('shows where it was found', () => {
    render(() => {
      return <ModerniseList suggestions={[suggestion()]} targeted={7} />;
    });

    expect(screen.getByText('app.css:83')).toBeInstanceOf(HTMLElement);
  });

  it('shows the file alone when there is no line', () => {
    render(() => {
      return (
        <ModerniseList
          suggestions={[suggestion({ location: { url: 'https://shop.example.test/app.css' } })]}
          targeted={7}
        />
      );
    });

    expect(screen.getByText('app.css')).toBeInstanceOf(HTMLElement);
  });

  it('says how long the replacement has been Baseline when that is known', () => {
    render(() => {
      return <ModerniseList suggestions={[suggestion()]} targeted={7} />;
    });

    expect(screen.getByText(/Baseline since 2024-09-14/u)).toBeInstanceOf(HTMLElement);
  });

  it('omits the Baseline note when no date is recorded', () => {
    render(() => {
      return <ModerniseList suggestions={[suggestion({ baselineDate: undefined })]} targeted={7} />;
    });

    expect(screen.queryByText(/Baseline since/u)).toBeNull();
  });

  it('links the replacement without leaking the opener', () => {
    render(() => {
      return <ModerniseList suggestions={[suggestion()]} targeted={7} />;
    });

    expect(screen.getByRole('link').getAttribute('rel')).toBe('noreferrer noopener');
  });
});
