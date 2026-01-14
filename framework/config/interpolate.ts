const ENV_VAR_PATTERN = /\$\{([^}:]+)(?::-([^}]*))?\}/g;

export class MissingEnvVarError extends Error {
  constructor(varName: string) {
    super(`Missing required environment variable: ${varName}`);
    this.name = 'MissingEnvVarError';
  }
}

function interpolateString(value: string): string {
  return value.replace(ENV_VAR_PATTERN, (match, varName: string, defaultValue?: string) => {
    const envValue = process.env[varName];
    if (envValue !== undefined) {
      return envValue;
    }
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new MissingEnvVarError(varName);
  });
}

export function interpolateEnvVars<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return interpolateString(obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => interpolateEnvVars(item)) as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateEnvVars(value);
    }
    return result as T;
  }

  return obj;
}
