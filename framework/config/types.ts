export type ScreenshotMode = 'off' | 'on' | 'only-on-failure';
export type TraceMode = 'off' | 'on' | 'retain-on-failure';
export type VideoMode = 'off' | 'on' | 'retain-on-failure';

export interface DiagnosticsConfig {
  screenshot: ScreenshotMode;
  trace: TraceMode;
  video: VideoMode;
}

export interface TimeoutsConfig {
  navigation: number;
  action: number;
  assertion: number;
}

export interface CredentialsConfig {
  username: string;
  password: string;
}

export interface SiteConfig {
  baseUrl: string;
  credentials?: CredentialsConfig;
  timeouts: TimeoutsConfig;
  diagnostics?: DiagnosticsConfig;
}

export interface ResolveOptions {
  site: string;
  env?: string;
}
