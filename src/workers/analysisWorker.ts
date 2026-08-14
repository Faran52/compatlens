import { analyzeResources } from '@engine';

import { ANALYSIS_PROTOCOL, isAnalysisRequest } from './analysisContract';

import type { AnalysisResponse } from './analysisContract';

// Keep parsing off the panel thread without putting worker logic in the engine.
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
