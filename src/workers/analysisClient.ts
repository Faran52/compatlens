import { ANALYSIS_PROTOCOL, isAnalysisResponse } from './analysisContract';

import type { AnalysisReport } from '@engine';
import type { AnalysisRequest, WorkerLike } from './analysisContract';

export type AnalysisJob = Omit<AnalysisRequest, 'kind' | 'version' | 'id'>;

export interface AnalysisClient {
  analyze(job: AnalysisJob): Promise<AnalysisReport>;
  close(): void;
}

interface Pending {
  resolve: (report: AnalysisReport) => void;
  reject: (error: Error) => void;
}

// The engine keeps its plain signature; only this seam knows a worker exists.
export const createAnalysisClient = (worker: WorkerLike): AnalysisClient => {
  const pending = new Map<number, Pending>();
  let nextId = 0;

  worker.addEventListener('message', (event) => {
    if (!isAnalysisResponse(event.data)) {
      return;
    }

    const waiting = pending.get(event.data.id);

    if (waiting === undefined) {
      return;
    }

    pending.delete(event.data.id);

    if (event.data.kind === 'error') {
      waiting.reject(new Error(event.data.message));

      return;
    }

    waiting.resolve(event.data.report);
  });

  return {
    analyze: (job) => {
      nextId += 1;

      const id = nextId;

      return new Promise<AnalysisReport>((resolve, reject) => {
        pending.set(id, { resolve, reject });
        worker.postMessage({ kind: 'analyze', version: ANALYSIS_PROTOCOL, id, ...job });
      });
    },
    close: () => {
      for (const waiting of pending.values()) {
        waiting.reject(new Error('The analysis worker was closed.'));
      }

      pending.clear();
      worker.terminate();
    },
  };
};
