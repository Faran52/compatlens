// Narrow facade so nothing below depends on the ambient `chrome` global.
interface HarRequest {
  url: string;
}

interface HarContent {
  mimeType: string;
}

interface HarResponse {
  content: HarContent;
}

export interface HarEntry {
  request: HarRequest;
  response: HarResponse;
  getContent?(callback: (content: string, encoding: string) => void): void; // absent in Firefox
}

export interface HarLog {
  entries: HarEntry[];
}

interface NavigationEvent {
  addListener(callback: (url: string) => void): void;
  removeListener(callback: (url: string) => void): void;
}

export interface DevToolsNetwork {
  getHAR(callback: (har: HarLog) => void): void;
  onNavigated: NavigationEvent;
}

export interface InspectedWindowException {
  isException: boolean;
  value?: string;
}

// getResources omits MIME types; the HAR supplies them
export interface InspectedResource {
  url: string;
  getContent(callback: (content: string, encoding: string) => void): void;
}

export interface DevToolsInspectedWindow {
  eval(
    expression: string,
    callback: (result: unknown, exception?: InspectedWindowException) => void,
  ): void;
  getResources?(callback: (resources: InspectedResource[]) => void): void; // Chrome only
}

export interface ChromeDevToolsFacade {
  network: DevToolsNetwork;
  inspectedWindow: DevToolsInspectedWindow;
}
