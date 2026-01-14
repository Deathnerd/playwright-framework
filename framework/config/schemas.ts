import { z } from 'zod';

export const ScreenshotModeSchema = z.enum(['off', 'on', 'only-on-failure']);

export const TraceModeSchema = z.enum(['off', 'on', 'retain-on-failure']);

export const VideoModeSchema = z.enum(['off', 'on', 'retain-on-failure']);

export const DiagnosticsConfigSchema = z.object({
  screenshot: ScreenshotModeSchema,
  trace: TraceModeSchema,
  video: VideoModeSchema,
});

export const TimeoutsConfigSchema = z.object({
  navigation: z.number().positive(),
  action: z.number().positive(),
  assertion: z.number().positive(),
});

export const CredentialsConfigSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export const SiteConfigSchema = z.object({
  enabled: z.boolean().optional(),
  baseUrl: z.string().url(),
  credentials: CredentialsConfigSchema.optional(),
  timeouts: TimeoutsConfigSchema,
  diagnostics: DiagnosticsConfigSchema.optional(),
});

export type ValidatedSiteConfig = z.infer<typeof SiteConfigSchema>;
