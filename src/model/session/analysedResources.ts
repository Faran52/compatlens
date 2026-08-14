import type { ResourceInput } from '@engine';

interface AnalysedResources {
  unanalysed: (resources: readonly ResourceInput[]) => readonly ResourceInput[];
  record: (resources: readonly ResourceInput[]) => void;
  forget: () => void;
}

// FNV-1a, and a digest rather than the text, because the session must never retain a resource body.
const digestOf = (content: string): number => {
  let hash = 0x811c9dc5;

  for (let index = 0; index < content.length; index += 1) {
    hash = Math.imul(hash ^ content.charCodeAt(index), 0x01000193);
  }

  return hash >>> 0;
};

// A sheet and its map arrive on different drains, so a body whose map caught up is not the same read.
const stampOf = (resource: ResourceInput): number => {
  return digestOf(resource.content) ^ digestOf(resource.sourceMap ?? '');
};

// Every drain re-reads the same stylesheets, and parsing one again only yields findings already held.
export const createAnalysedResources = (): AnalysedResources => {
  const stamps = new Map<string, number>();

  return {
    unanalysed: (resources) => {
      return resources.filter((resource) => {
        if (resource.kind !== 'css') {
          return true; // markup is a fresh mutation each time, never a re-read
        }

        return stamps.get(resource.url) !== stampOf(resource);
      });
    },
    // Recorded only once the analysis behind it succeeded, so a failed batch is retried, not retired.
    record: (resources) => {
      for (const resource of resources) {
        if (resource.kind === 'css') {
          stamps.set(resource.url, stampOf(resource));
        }
      }
    },
    forget: () => {
      stamps.clear();
    },
  };
};
