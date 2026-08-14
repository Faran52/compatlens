import { blockedFindingFixture } from '@mocks';
import { screen } from '@solidjs/testing-library';
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { mountLivePanel } from './LivePanelMount';

import type { Occurrence, SessionReport } from '@engine';
import type { LiveSession } from '@model';

const occurrence: Occurrence = {
  ...blockedFindingFixture,
  route: '/products',
  firstSeen: 'now',
  impacts: [{ slot: 'chrome', targetVersion: '121', supportedFrom: '147', supported: false }],
};

const report = (occurrences: readonly Occurrence[]): SessionReport => {
  return {
    occurrences,
    suggestions: [],
    routes: ['/products'],
    resources: { total: 1, parsed: 1, failed: 0 },
    coverage: { mappedDetections: 1, registryFeatures: 34 },
    warnings: [],
    watching: true,
    capped: false,
  };
};

const sessionStub = (overrides: Partial<LiveSession> = {}): LiveSession => {
  return {
    start: () => {
      return Promise.resolve();
    },
    tick: () => {
      return Promise.resolve(report([occurrence]));
    },
    report: () => {
      return report([]);
    },
    reset: () => {
      return Promise.resolve();
    },
    ...overrides,
  };
};

const mount = (overrides: Partial<Parameters<typeof mountLivePanel>[0]> = {}) => {
  const container = document.createElement('div');

  document.body.append(container);

  const base: Parameters<typeof mountLivePanel>[0] = {
    container,
    host: '127.0.0.1:8765',
    session: sessionStub(),
    target: { chrome: '121' },
    intervalMs: 500,
    prefersDark: () => {
      return false;
    },
    onTargetChange: () => {
      return undefined;
    },
    schedule: () => {
      return () => {
        return undefined;
      };
    },
  };
  const dispose = mountLivePanel({ ...base, ...overrides });

  return { container, dispose };
};

describe('mountLivePanel', () => {
  it('renders the panel for the page being watched', () => {
    const { dispose } = mount();

    expect(screen.getByText('127.0.0.1:8765')).toBeInstanceOf(HTMLElement);
    dispose();
  });

  it('starts from whatever the session already holds', () => {
    const { dispose } = mount({ session: sessionStub({ report: () => {
      return report([occurrence]);
    } }) });

    expect(screen.getByText(blockedFindingFixture.name)).toBeInstanceOf(HTMLElement);
    dispose();
  });

  it('shows findings once a scheduled tick returns them', async () => {
    let run = (): void => {
      return undefined;
    };
    const { dispose } = mount({
      schedule: (callback) => {
        run = callback;

        return () => {
          return undefined;
        };
      },
    });

    run();
    await Promise.resolve();
    await Promise.resolve();

    expect(screen.getByText(blockedFindingFixture.name)).toBeInstanceOf(HTMLElement);
    dispose();
  });

  it('stops the schedule when the panel is disposed', () => {
    const stop = vi.fn();
    const { dispose } = mount({ schedule: () => {
      return stop;
    } });

    dispose();

    expect(stop).toHaveBeenCalledTimes(1);
  });
});
