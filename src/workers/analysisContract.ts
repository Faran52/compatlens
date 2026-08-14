import type {
  AnalysisReport,
  BrowserTarget,
  FeatureRegistryEntry,
  ModernizationRule,
  ResourceInput,
} from '@engine';

export interface AnalysisRequest {
  kind: 'analyze';
  version: number;
  id: number;
  resources: readonly ResourceInput[];
  registry: readonly FeatureRegistryEntry[];
  rules: readonly ModernizationRule[];
  target: BrowserTarget;
  warnings: readonly string[];
}

export interface AnalysisSuccess {
  kind: 'result';
  version: number;
  id: number;
  report: AnalysisReport;
}

export interface AnalysisFailure {
  kind: 'error';
  version: number;
  id: number;
  message: string;
}

export type AnalysisResponse = AnalysisSuccess | AnalysisFailure;

// Narrow view of a Worker so the client can be driven by a plain object in tests.
export interface WorkerLike {
  postMessage(message: AnalysisRequest): void;
  addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void;
  terminate(): void;
}

// Versioned so a stale worker left over from a reload is ignored rather than misread.
export const ANALYSIS_PROTOCOL = 1;

export const isAnalysisResponse = (value: unknown): value is AnalysisResponse => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (!('kind' in value) || !('version' in value) || !('id' in value)) {
    return false;
  }

  if (value.version !== ANALYSIS_PROTOCOL || typeof value.id !== 'number') {
    return false;
  }

  if (value.kind === 'result') {
    return 'report' in value;
  }

  return value.kind === 'error' && 'message' in value && typeof value.message === 'string';
};

export const isAnalysisRequest = (value: unknown): value is AnalysisRequest => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (!('kind' in value) || !('version' in value) || !('id' in value)) {
    return false;
  }

  return value.kind === 'analyze'
    && value.version === ANALYSIS_PROTOCOL
    && typeof value.id === 'number'
    && 'resources' in value
    && 'registry' in value
    && 'rules' in value
    && 'target' in value
    && 'warnings' in value;
};
