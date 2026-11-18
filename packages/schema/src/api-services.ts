/**
 * Every HTTP service with a generated client, the app that publishes its
 * OpenAPI document, and whether the public SDK and developer portal expose it.
 * Listed in the order the developer portal presents the public services.
 */
export const API_SERVICES = {
  main: { app: "api", public: true },
  activity: { app: "activity", public: true },
  auth: { app: "auth", public: false },
  battlelog: { app: "battlelog", public: true },
  catalog: { app: "catalog", public: true },
  search: { app: "search", public: true },
} as const;

export type ApiService = keyof typeof API_SERVICES;

export type PublicApiService = {
  [Service in ApiService]: (typeof API_SERVICES)[Service]["public"] extends true
    ? Service
    : never;
}[ApiService];

// SAFETY: API_SERVICES is a literal object, so its own keys are exactly ApiService.
export const API_SERVICE_NAMES = Object.keys(API_SERVICES) as ApiService[];

export const PUBLIC_API_SERVICES = API_SERVICE_NAMES.filter(
  (service): service is PublicApiService => API_SERVICES[service].public,
);

export const isPublicApiService = (
  service: string,
): service is PublicApiService =>
  PUBLIC_API_SERVICES.some((publicService) => publicService === service);

/** Deployed environments; `local` is the developer stack behind localhost. */
export type DeploymentEnvironment = "production" | "development" | "local";

/** The origin a service is reachable at, e.g. `https://dev-api.lootlog.pl`. */
export const apiServiceOrigin = (
  service: ApiService,
  environment: DeploymentEnvironment,
): string => {
  if (environment === "local")
    return `http://localhost/api/${service === "main" ? "lootlog" : service}`;

  const prefix = environment === "development" ? "dev-" : "";

  return `https://${prefix}${service === "main" ? "api" : service}.lootlog.pl`;
};
