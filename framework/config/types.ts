import { z } from 'zod';
import {
  ScreenshotModeSchema,
  TraceModeSchema,
  VideoModeSchema,
  DiagnosticsConfigSchema,
  TimeoutsConfigSchema,
  CredentialsConfigSchema,
  SiteConfigSchema,
} from './schemas.js';

// Derived types from Zod schemas
export type ScreenshotMode = z.infer<typeof ScreenshotModeSchema>;
export type TraceMode = z.infer<typeof TraceModeSchema>;
export type VideoMode = z.infer<typeof VideoModeSchema>;
export type DiagnosticsConfig = z.infer<typeof DiagnosticsConfigSchema>;
export type TimeoutsConfig = z.infer<typeof TimeoutsConfigSchema>;
export type CredentialsConfig = z.infer<typeof CredentialsConfigSchema>;
export type SiteConfig = z.infer<typeof SiteConfigSchema>;

// Interface not derived from schema
export interface ResolveOptions {
  site: string;
  env?: string;
}

// Re-export schemas for validation use
export {
  ScreenshotModeSchema,
  TraceModeSchema,
  VideoModeSchema,
  DiagnosticsConfigSchema,
  TimeoutsConfigSchema,
  CredentialsConfigSchema,
  SiteConfigSchema,
};
