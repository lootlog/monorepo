import {
  configureApiClients,
  type ApiServiceConfig,
} from "@lootlog/client/transport";
import {
  apiServiceOrigin,
  PUBLIC_API_SERVICES,
  type PublicApiService,
} from "@lootlog/schema/api-services";

export type LootlogApiOptions = {
  apiKey: string;
  environment?: "production" | "development";
  fetch?: ApiServiceConfig["fetch"];
  baseUrls?: Partial<Record<PublicApiService, string>>;
};

export function configureLootlogApi(options: LootlogApiOptions): () => void {
  if (!options.apiKey.trim()) throw new TypeError("apiKey must not be empty");

  const environment = options.environment ?? "production";

  return configureApiClients(
    Object.fromEntries(
      PUBLIC_API_SERVICES.map((service) => [
        service,
        {
          baseUrl:
            options.baseUrls?.[service] ??
            apiServiceOrigin(service, environment),
          credentials: "omit",
          fetch: options.fetch,
          getHeaders: () => ({ "X-Api-Key": options.apiKey }),
        } satisfies ApiServiceConfig,
      ]),
    ),
  );
}
