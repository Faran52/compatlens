import {
  featureRegistry,
  modernizationRules,
  widelyAvailableTarget,
} from '@compat-data';
import { mountLivePanel } from '@components/features';
import {
  captureLive,
  restartObserving,
  startObserving,
  subscribeToNavigation,
} from '@extension';
import { createLiveSession } from '@model';
import { createAnalysisClient } from '@workers';

import type { ChromeDevToolsFacade } from '@extension';

import './styles/tokens.css';
import './style.css';
import './styles/global.css';

interface PanelChromeGlobal {
  devtools: ChromeDevToolsFacade;
}

declare const chrome: PanelChromeGlobal; // the only place the ambient global is touched

const POLL_MS = 750; // slow enough to batch a churning app, quick enough to feel live

let currentTarget = widelyAvailableTarget;

const container = document.getElementById('root');

if (!container) {
  throw new Error('CompatLens panel root element is missing.');
}

const worker = new Worker(new URL('./workers/analysisWorker.ts', import.meta.url), {
  type: 'module',
});
const client = createAnalysisClient(worker);

const session = createLiveSession({
  observe: () => {
    return startObserving(chrome.devtools);
  },
  reobserve: () => {
    return restartObserving(chrome.devtools);
  },
  capture: () => {
    return captureLive(chrome.devtools);
  },
  analyze: (job) => {
    return client.analyze(job);
  },
  registry: featureRegistry,
  rules: modernizationRules,
  target: () => {
    return currentTarget;
  },
  timestamp: () => {
    return new Date().toISOString();
  },
});

void session.start();

// A navigation leaves the panel alive and the new document uninstrumented, so it is reinstalled.
subscribeToNavigation(chrome.devtools, () => {
  void session.start();
});

mountLivePanel({
  container,
  host: 'connecting…',
  session,
  target: widelyAvailableTarget,
  onTargetChange: (next) => {
    currentTarget = next;
  },
  intervalMs: POLL_MS,
  prefersDark: () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  },
  schedule: (run, ms) => {
    const id = setInterval(run, ms);

    return () => {
      clearInterval(id);
    };
  },
});
