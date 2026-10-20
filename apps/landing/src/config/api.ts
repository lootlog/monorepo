const DEFAULT_API_URL = "http://localhost/api/lootlog";

export function resolveApiUrl(configuredUrl?: string): string {
  return configuredUrl || DEFAULT_API_URL;
}

/** The main Lootlog API; the landing reads only its public endpoints. */
export const API_URL = resolveApiUrl(import.meta.env.VITE_API_URL);
