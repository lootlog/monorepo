import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { Config, Option, type Redacted, Schema } from "effect";

const optionalRedacted = (name: string) =>
  Config.option(Config.redacted(name)).pipe(Config.map(Option.getOrUndefined));

const enabledValue = (value: string): boolean =>
  ["1", "true", "yes", "on"].includes(value.toLowerCase());

const compatibilityBoolean = (name: string) =>
  Config.string(name).pipe(
    Config.withDefault("false"),
    Config.map(enabledValue),
  );

export interface ApiConfiguration {
  readonly environment: RuntimeEnvironment;
  readonly port: number;
  readonly serviceName: string;
  readonly serviceNamespace: string;
  readonly postgresqlConnectionUri: Redacted.Redacted<string> | undefined;
  readonly rabbitmqUri: Redacted.Redacted<string>;
  readonly redis: {
    readonly host: string;
    readonly port: number;
    readonly username: string;
    readonly password: Redacted.Redacted<string>;
  };
  readonly authServiceUrl: URL;
  readonly battlelogServiceUrl: URL;
  readonly discordBotServiceUrl: URL;
  readonly reservationsCardsUrl: URL;
  readonly mapsApiUrl: URL;
  readonly telemetry: {
    readonly endpoint: Redacted.Redacted<string> | undefined;
    readonly headers: Redacted.Redacted<string> | undefined;
    readonly nodeResourceDetectors: string;
    readonly tracesExporter: string;
  };
  readonly timerCleanup: {
    readonly enabled: string;
    readonly retentionDays: number;
  };
  readonly reservationsCleanup: {
    readonly enabled: string;
    readonly retentionDays: number;
  };
  readonly nodeWarningDiagnosticsEnabled: boolean;
  readonly hostName: string | undefined;
}

/** The complete API environment contract, decoded by Effect Config. */
export const apiConfiguration = Config.all({
  environment: Config.literals(
    [
      RuntimeEnvironment.LOCAL,
      RuntimeEnvironment.DEV,
      RuntimeEnvironment.STAGING,
      RuntimeEnvironment.PROD,
    ],
    "ENV",
  ).pipe(Config.withDefault(RuntimeEnvironment.LOCAL)),
  port: Config.number("PORT"),
  serviceName: Config.string("SERVICE_NAME").pipe(Config.withDefault("api")),
  serviceNamespace: Config.string("SERVICE_NAMESPACE").pipe(
    Config.withDefault("local"),
  ),
  postgresqlConnectionUri: optionalRedacted("POSTGRESQL_CONNECTION_URI"),
  rabbitmqUri: Config.redacted("RABBITMQ_URI"),
  redis: Config.all({
    host: Config.string("REDIS_HOST"),
    port: Config.number("REDIS_PORT"),
    username: Config.string("REDIS_USERNAME"),
    password: Config.redacted("REDIS_PASSWORD"),
  }),
  authServiceUrl: Config.schema(Schema.URLFromString, "AUTH_SERVICE_URL"),
  battlelogServiceUrl: Config.schema(
    Schema.URLFromString,
    "BATTLELOG_SERVICE_URL",
  ).pipe(Config.withDefault(new URL("http://battlelog-service:4000"))),
  discordBotServiceUrl: Config.schema(
    Schema.URLFromString,
    "DISCORD_BOT_SERVICE_URL",
  ).pipe(Config.withDefault(new URL("http://discord-bot:4000"))),
  reservationsCardsUrl: Config.schema(
    Schema.URLFromString,
    "RESERVATIONS_CARDS_URL",
  ),
  mapsApiUrl: Config.schema(Schema.URLFromString, "MAPS_API_URL"),
  telemetry: Config.all({
    endpoint: optionalRedacted("OTEL_EXPORTER_OTLP_ENDPOINT"),
    headers: optionalRedacted("OTEL_EXPORTER_OTLP_HEADERS"),
    nodeResourceDetectors: Config.string("OTEL_NODE_RESOURCE_DETECTORS").pipe(
      Config.withDefault("env,host,os,process"),
    ),
    tracesExporter: Config.string("OTEL_TRACES_EXPORTER").pipe(
      Config.withDefault("otlp"),
    ),
  }),
  timerCleanup: Config.all({
    enabled: Config.string("TIMER_CLEANUP_ENABLED").pipe(
      Config.withDefault("true"),
    ),
    retentionDays: Config.finite("TIMER_RETENTION_DAYS").pipe(
      Config.withDefault(7),
    ),
  }),
  reservationsCleanup: Config.all({
    enabled: Config.string("RESERVATIONS_CLEANUP_ENABLED").pipe(
      Config.withDefault("true"),
    ),
    retentionDays: Config.finite("RESERVATIONS_RETENTION_DAYS").pipe(
      Config.withDefault(30),
    ),
  }),
  nodeWarningDiagnosticsEnabled: compatibilityBoolean(
    "NODE_WARNING_DIAGNOSTICS_ENABLED",
  ),
  hostName: Config.option(Config.string("HOSTNAME")).pipe(
    Config.map(Option.getOrUndefined),
  ),
}) satisfies Config.Config<ApiConfiguration>;
