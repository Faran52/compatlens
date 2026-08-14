import { analyzeResources } from '@engine';

import { ANALYSIS_PROTOCOL, isAnalysisRequest } from './analysisContract';

import type { AnalysisResponse } from './analysisContract';

// Bootstrap: the worker owns no logic, it only moves parse work off the panel thread.
const reply = (message: AnalysisResponse): void => {
  postMessage(message);
};

addEventListener('message', (event: MessageEvent) => {
  if (!isAnalysisRequest(event.data)) {
    return;
  }

  const request = event.data;

  try {
    const report = analyzeResources({
      resources: request.resources,
      registry: request.registry,
      rules: request.rules,
      target: request.target,
      warnings: request.warnings,
      now: () => {
        return performance.now();
      },
    });

    reply({ kind: 'result', version: ANALYSIS_PROTOCOL, id: request.id, report });
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'The analysis worker failed.';

    reply({ kind: 'error', version: ANALYSIS_PROTOCOL, id: request.id, message });
  }
});
