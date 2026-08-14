import type { SessionReport } from '@engine';

type PanelPhase = 'stalled' | 'connecting' | 'watching';

const counted = (count: number, noun: string): string => {
  return `${String(count)} ${noun}${count === 1 ? '' : 's'}`;
};

// Watching but never having read anything is not the same as having read the page and found it clean.
export const phaseOf = (report: SessionReport): PanelPhase => {
  if (!report.watching) {
    return 'stalled';
  }

  return report.routes.length === 0 ? 'connecting' : 'watching';
};

const EMPTY_MESSAGES: Readonly<Record<PanelPhase, string>> = {
  stalled: 'Not watching this page yet. Reload the page, or reopen DevTools on it.',
  connecting: 'Reading the page. Findings will appear as soon as it has been read.',
  watching: 'Nothing to fix for this target yet. Use the page and findings will appear.',
};

export const emptyMessageFor = (report: SessionReport): string => {
  return EMPTY_MESSAGES[phaseOf(report)];
};

// Filters cannot be applied to a page that has not been read, so the rail waits with it.
export const isConnecting = (report: SessionReport): boolean => {
  return phaseOf(report) === 'connecting';
};

export const statusLineFor = (report: SessionReport): string => {
  if (!report.watching) {
    return 'not watching';
  }

  if (report.routes.length === 0) {
    return 'connecting';
  }

  return [
    'watching',
    counted(report.routes.length, 'route'),
    `${String(report.resources.parsed)} of ${String(report.resources.total)} read`,
    `${counted(report.coverage.mappedDetections, 'feature')} matched`,
  ].join(' · ');
};
