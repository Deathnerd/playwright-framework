import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { SiteConfig, ResolveOptions } from './types.js';
import { interpolateEnvVars } from './interpolate.js';
import { SiteConfigSchema } from './schemas.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ConfigLoaderOptions {
  sitesDir?: string;
  frameworkDir?: string;
  localConfigPath?: string;
}

export class ConfigLoader {
  private readonly sitesDir: string;
  private readonly frameworkDir: string;
  private readonly localConfigPath: string;

  constructor(options: ConfigLoaderOptions = {}) {
    const rootDir = path.resolve(__dirname, '../..');
    this.sitesDir = options.sitesDir ?? path.join(rootDir, 'sites');
    this.frameworkDir = options.frameworkDir ?? path.join(rootDir, 'framework');
    this.localConfigPath = options.localConfigPath ?? path.join(rootDir, 'local.json');
  }

  async resolve(options: ResolveOptions): Promise<SiteConfig> {
    const { site, env } = options;

    // Layer 1: Framework defaults
    const defaults = await this.loadJson<Partial<SiteConfig>>(
      path.join(this.frameworkDir, 'defaults.json')
    );

    // Layer 2: Site config
    const siteConfigPath = path.join(this.sitesDir, site, 'config.json');
    const siteConfig = await this.loadJson<Partial<SiteConfig>>(siteConfigPath, true);

    // Layer 3: Environment config (optional)
    let envConfig: Partial<SiteConfig> = {};
    if (env) {
      const envConfigPath = path.join(this.sitesDir, site, 'env', `${env}.json`);
      envConfig = await this.loadJson<Partial<SiteConfig>>(envConfigPath);
    }

    // Layer 4: Local overrides (optional, gitignored)
    const localConfig = await this.loadJson<Partial<SiteConfig>>(this.localConfigPath);

    // Merge all layers
    const merged = this.deepMerge(defaults, siteConfig, envConfig, localConfig);

    // Interpolate environment variables
    const interpolated = interpolateEnvVars(merged);

    // Validate with Zod schema
    return SiteConfigSchema.parse(interpolated);
  }

  private async loadJson<T>(filePath: string, required = false): Promise<T> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        if (required) {
          throw new Error(`Site config not found: ${filePath}`);
        }
        return {} as T;
      }
      throw error;
    }
  }

  /**
   * Synchronously check if a site/environment is enabled.
   * Returns { enabled: boolean, reason?: string } where reason explains why it's disabled.
   */
  isEnabledSync(options: ResolveOptions): { enabled: boolean; reason?: string } {
    const { site, env } = options;

    // Check site config
    const siteConfigPath = path.join(this.sitesDir, site, 'config.json');
    const siteConfig = this.loadJsonSync<Partial<SiteConfig>>(siteConfigPath);

    if (siteConfig.enabled === false) {
      return { enabled: false, reason: `Site "${site}" is disabled in config.json` };
    }

    // Check environment config if specified
    if (env) {
      const envConfigPath = path.join(this.sitesDir, site, 'env', `${env}.json`);
      const envConfig = this.loadJsonSync<Partial<SiteConfig>>(envConfigPath);

      if (envConfig.enabled === false) {
        return { enabled: false, reason: `Environment "${env}" is disabled for site "${site}"` };
      }
    }

    // Check local overrides
    const localConfig = this.loadJsonSync<Partial<SiteConfig>>(this.localConfigPath);
    if (localConfig.enabled === false) {
      return { enabled: false, reason: `Disabled in local.json` };
    }

    return { enabled: true };
  }

  private loadJsonSync<T>(filePath: string): T {
    try {
      const content = fsSync.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch {
      return {} as T;
    }
  }

  private deepMerge(...objects: Partial<SiteConfig>[]): Partial<SiteConfig> {
    const result: Record<string, unknown> = {};

    for (const obj of objects) {
      for (const [key, value] of Object.entries(obj)) {
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          // Safe cast: we've verified value is a non-null, non-array object
          const existingValue = (result[key] ?? {}) as Record<string, unknown>;
          const newValue = value as unknown as Record<string, unknown>;
          result[key] = this.deepMerge(existingValue, newValue);
        } else {
          result[key] = value;
        }
      }
    }

    return result as Partial<SiteConfig>;
  }
}
