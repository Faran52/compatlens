import {
  describe,
  expect,
  it,
} from 'vitest';

import { reportFixture } from '@mocks';

import {
  ANALYSIS_PROTOCOL,
  isAnalysisRequest,
  isAnalysisResponse,
} from './analysisContract';

describe('isAnalysisResponse', () => {
  it('accepts a result carrying a report', () => {
    expect(isAnalysisResponse({
      kind: 'result',
      version: ANALYSIS_PROTOCOL,
      id: 1,
      report: reportFixture,
    })).toBe(true);
  });

  it('accepts an error carrying a reason', () => {
    expect(isAnalysisResponse({
      kind: 'error',
      version: ANALYSIS_PROTOCOL,
      id: 1,
      message: 'blew up',
    })).toBe(true);
  });

  it.each([
    ['a string', 'nonsense'],
    ['null', null],
    ['an object with no kind', { version: ANALYSIS_PROTOCOL, id: 1 }],
    ['an object with no version', { kind: 'result', id: 1 }],
    ['an object with no id', { kind: 'result', version: ANALYSIS_PROTOCOL }],
    ['another protocol version', { kind: 'result', version: 99, id: 1, report: reportFixture }],
    ['an id that is not a number', { kind: 'result', version: ANALYSIS_PROTOCOL, id: 'x', report: reportFixture }],
    ['a result with no report', { kind: 'result', version: ANALYSIS_PROTOCOL, id: 1 }],
    ['an error with no message', { kind: 'error', version: ANALYSIS_PROTOCOL, id: 1 }],
    ['an error whose message is not a string', { kind: 'error', version: ANALYSIS_PROTOCOL, id: 1, message: 7 }],
    ['an unknown kind', { kind: 'shrug', version: ANALYSIS_PROTOCOL, id: 1 }],
  ])('rejects %s', (_label: string, value: unknown) => {
    expect(isAnalysisResponse(value)).toBe(false);
  });
});

const job = {
  kind: 'analyze',
  version: ANALYSIS_PROTOCOL,
  id: 1,
  resources: [],
  registry: [],
  rules: [],
  target: { chrome: '120' },
  warnings: [],
};

describe('isAnalysisRequest', () => {
  it('accepts a complete analyse request', () => {
    expect(isAnalysisRequest(job)).toBe(true);
  });

  it.each([
    ['a string', 'nonsense'],
    ['null', null],
    ['a request with no kind', { version: ANALYSIS_PROTOCOL, id: 1 }],
    ['a request with no version', { kind: 'analyze', id: 1 }],
    ['a request with no id', { kind: 'analyze', version: ANALYSIS_PROTOCOL }],
    ['another kind', { ...job, kind: 'result' }],
    ['another protocol version', { ...job, version: 99 }],
    ['an id that is not a number', { ...job, id: 'x' }],
  ])('rejects %s', (_label: string, value: unknown) => {
    expect(isAnalysisRequest(value)).toBe(false);
  });

  const without = (field: string): Record<string, unknown> => {
    return Object.fromEntries(Object.entries(job).filter(([key]) => {
      return key !== field;
    }));
  };

  it.each([
    ['resources'],
    ['registry'],
    ['rules'],
    ['target'],
    ['warnings'],
  ])('rejects a request missing %s', (field: string) => {
    expect(isAnalysisRequest(without(field))).toBe(false);
  });
});
