const DEFAULT_AUTH_SERVICE_URL = "http://localhost:4000";

export function resolveAuthServiceUrl(configuredUrl?: string): string {
  return configuredUrl || DEFAULT_AUTH_SERVICE_URL;
}

export function createAuthCallbackUrl(origin: string): string {
  return `${origin}/@me`;
}

export const AUTH_SERVICE_URL = resolveAuthServiceUrl(
  import.meta.env.VITE_AUTH_SERVICE_URL,
);
