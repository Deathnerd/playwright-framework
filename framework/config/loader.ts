import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { SiteConfig, ResolveOptions } from './types.js';
import { interpolateEnvVars } from './interpolate.js';

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

    return interpolated as SiteConfig;
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

  private deepMerge(...objects: Partial<SiteConfig>[]): Partial<SiteConfig> {
    const result: Record<string, unknown> = {};

    for (const obj of objects) {
      for (const [key, value] of Object.entries(obj)) {
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          result[key] = this.deepMerge(
            (result[key] as Record<string, unknown>) ?? {},
            value as Record<string, unknown>
          );
        } else {
          result[key] = value;
        }
      }
    }

    return result as Partial<SiteConfig>;
  }
}
