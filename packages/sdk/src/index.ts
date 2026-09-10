import {
  configureApiClients,
  type ApiServiceConfig,
} from "@lootlog/client/transport";

export type LootlogApiOptions = {
  apiKey: string;
  environment?: "production" | "development";
  fetch?: ApiServiceConfig["fetch"];
  baseUrls?: Partial<
    Record<"main" | "activity" | "battlelog" | "search", string>
  >;
};

/** Configure the generated HTTP functions. Returns an idempotent cleanup function. */
export function configureLootlogApi(options: LootlogApiOptions): () => void {
  if (!options.apiKey.trim()) throw new TypeError("apiKey must not be empty");
  const prefix = options.environment === "development" ? "dev-" : "";

  const configuration = (
    service: "main" | "activity" | "battlelog" | "search",
  ): ApiServiceConfig => ({
    baseUrl:
      options.baseUrls?.[service] ??
      `https://${prefix}${service === "main" ? "api" : service}.lootlog.pl`,
    credentials: "omit",
    fetch: options.fetch,
    getHeaders: () => ({ "X-Api-Key": options.apiKey }),
  });

  return configureApiClients({
    main: configuration("main"),
    activity: configuration("activity"),
    battlelog: configuration("battlelog"),
    search: configuration("search"),
  });
}
