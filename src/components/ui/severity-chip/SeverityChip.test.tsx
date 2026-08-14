import { render, screen } from '@solidjs/testing-library';
import {
  describe,
  expect,
  it,
} from 'vitest';

import { SeverityChip } from './SeverityChip';

describe('SeverityChip', () => {
  it('names what breaks in words, not colour alone', () => {
    render(() => {
      return <SeverityChip risk="breaks" verified />;
    });

    expect(screen.getByText('Breaks')).toBeInstanceOf(HTMLElement);
  });

  it('names what merely degrades', () => {
    render(() => {
      return <SeverityChip risk="degrades" verified />;
    });

    expect(screen.getByText('Degrades')).toBeInstanceOf(HTMLElement);
  });

  it('marks unverified beside the severity rather than instead of it', () => {
    render(() => {
      return <SeverityChip risk="breaks" verified={false} />;
    });

    expect(screen.getByText('Breaks')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('unverified')).toBeInstanceOf(HTMLElement);
  });

  it('says nothing about confidence when support was confirmed', () => {
    render(() => {
      return <SeverityChip risk="degrades" verified />;
    });

    expect(screen.queryByText('unverified')).toBeNull();
  });

  it('exposes the severity as a data hook for styling and tests', () => {
    render(() => {
      return <SeverityChip risk="breaks" verified />;
    });

    expect(screen.getByText('Breaks').getAttribute('data-severity')).toBe('breaks');
  });
});
