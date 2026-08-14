import { reportFixture } from '@mocks';
import {
  describe,
  expect,
  it,
} from 'vitest';

import { createAnalysisClient } from './analysisClient';
import { ANALYSIS_PROTOCOL } from './analysisContract';

import type { AnalysisRequest, WorkerLike } from './analysisContract';

interface FakeWorker extends WorkerLike {
  sent: AnalysisRequest[];
  reply: (data: unknown) => void;
  terminated: boolean;
}

const fakeWorker = (): FakeWorker => {
  const sent: AnalysisRequest[] = [];
  const listeners: ((event: { data: unknown }) => void)[] = [];

  return {
    sent,
    terminated: false,
    postMessage: (message) => {
      sent.push(message);
    },
    addEventListener: (_type, listener) => {
      listeners.push(listener);
    },
    terminate() {
      this.terminated = true;
    },
    reply: (data) => {
      for (const listener of listeners) {
        listener({ data });
      }
    },
  };
};

const job = {
  resources: [],
  registry: [],
  rules: [],
  target: { chrome: '120' },
  warnings: [],
};

describe('createAnalysisClient', () => {
  it('stamps every request with the protocol version', () => {
    const worker = fakeWorker();
    const client = createAnalysisClient(worker);

    void client.analyze(job);

    expect(worker.sent[0]?.version).toBe(ANALYSIS_PROTOCOL);
    expect(worker.sent[0]?.kind).toBe('analyze');
  });

  it('resolves the report the worker sends back', async () => {
    const worker = fakeWorker();
    const client = createAnalysisClient(worker);
    const result = client.analyze(job);

    worker.reply({ kind: 'result', version: ANALYSIS_PROTOCOL, id: 1, report: reportFixture });

    await expect(result).resolves.toEqual(reportFixture);
  });

  it('rejects with the reason the worker reported', async () => {
    const worker = fakeWorker();
    const client = createAnalysisClient(worker);
    const result = client.analyze(job);

    worker.reply({ kind: 'error', version: ANALYSIS_PROTOCOL, id: 1, message: 'parse blew up' });

    await expect(result).rejects.toThrow('parse blew up');
  });

  it('keeps concurrent jobs apart by id', async () => {
    const worker = fakeWorker();
    const client = createAnalysisClient(worker);
    const first = client.analyze(job);
    const second = client.analyze(job);

    worker.reply({ kind: 'result', version: ANALYSIS_PROTOCOL, id: 2, report: reportFixture });
    worker.reply({ kind: 'error', version: ANALYSIS_PROTOCOL, id: 1, message: 'first failed' });

    await expect(second).resolves.toEqual(reportFixture);
    await expect(first).rejects.toThrow('first failed');
  });

  it('ignores a message that is not a response at all', async () => {
    const worker = fakeWorker();
    const client = createAnalysisClient(worker);
    const result = client.analyze(job);

    worker.reply('nonsense');
    worker.reply({ kind: 'result', version: ANALYSIS_PROTOCOL, id: 1, report: reportFixture });

    await expect(result).resolves.toEqual(reportFixture);
  });

  it('ignores a reply from a worker speaking another protocol version', async () => {
    const worker = fakeWorker();
    const client = createAnalysisClient(worker);
    const result = client.analyze(job);

    worker.reply({ kind: 'result', version: 99, id: 1, report: reportFixture });
    worker.reply({ kind: 'result', version: ANALYSIS_PROTOCOL, id: 1, report: reportFixture });

    await expect(result).resolves.toEqual(reportFixture);
  });

  it('ignores a reply for a job it is no longer waiting on', () => {
    const worker = fakeWorker();
    const client = createAnalysisClient(worker);

    expect(() => {
      worker.reply({ kind: 'result', version: ANALYSIS_PROTOCOL, id: 404, report: reportFixture });
    }).not.toThrow();
    expect(client).toBeDefined();
  });

  it('fails the jobs still in flight when it is closed', async () => {
    const worker = fakeWorker();
    const client = createAnalysisClient(worker);
    const result = client.analyze(job);

    client.close();

    await expect(result).rejects.toThrow('The analysis worker was closed.');
    expect(worker.terminated).toBe(true);
  });
});
