import {
  type BaseServiceConfiguration,
  baseServiceConfig,
  commaSeparatedConfig,
  redisUrlConfig,
} from "@lootlog/instrumentation/service-config";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { Config, Option, type Redacted, Schema } from "effect";

const optionalRedacted = (name: string) =>
  Config.option(Config.Redacted(name)).pipe(Config.map(Option.getOrUndefined));

const flag = (name: string, defaultValue: boolean) =>
  Config.Boolean(name).pipe(Config.withDefault(defaultValue));

/** Read by the API and by the catalog replay script. */
export const rabbitmqUriConfig = Config.Redacted("RABBITMQ_URI");

/** Read by every process that opens the API database. */
export const databaseUrlConfig = Config.Redacted("POSTGRESQL_CONNECTION_URI");

export interface ApiConfiguration extends BaseServiceConfiguration {
  readonly isLocal: boolean;
  readonly authIdpTokenSecret?: Redacted.Redacted<string>;
  readonly battlelogCleanupSecret?: Redacted.Redacted<string>;
  readonly rabbitmqUri: Redacted.Redacted<string>;
  readonly redisUrl: Redacted.Redacted<string>;
  readonly authServiceUrl: URL;
  readonly battlelogServiceUrl: URL;
  readonly discordBotServiceUrl: URL;
  readonly reservationsCardsUrl: URL;
  readonly mapsApiUrl: URL;
  readonly timerCleanup: {
    readonly enabled: boolean;
    readonly retentionDays: number;
  };
  readonly reservationsCleanup: {
    readonly enabled: boolean;
    readonly retentionDays: number;
  };
  readonly nodeWarningDiagnosticsEnabled: boolean;
  /** Internal User ids shown as global chat admins and allowed to moderate it. */
  readonly globalChatAdminUserIds: ReadonlyArray<string>;
  readonly hostName: string | undefined;
}

/** The complete API environment contract, decoded by Effect Config. */
export const apiConfiguration: Config.Config<ApiConfiguration> = Config.all({
  base: baseServiceConfig("api"),
  authIdpTokenSecret: optionalRedacted("AUTH_IDP_TOKEN_SECRET"),
  battlelogCleanupSecret: optionalRedacted("BATTLELOG_CLEANUP_SECRET"),
  rabbitmqUri: rabbitmqUriConfig,
  redisUrl: redisUrlConfig,
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
  timerCleanup: Config.all({
    enabled: flag("TIMER_CLEANUP_ENABLED", true),
    retentionDays: Config.Finite("TIMER_RETENTION_DAYS").pipe(
      Config.withDefault(7),
    ),
  }),
  reservationsCleanup: Config.all({
    enabled: flag("RESERVATIONS_CLEANUP_ENABLED", true),
    retentionDays: Config.Finite("RESERVATIONS_RETENTION_DAYS").pipe(
      Config.withDefault(30),
    ),
  }),
  nodeWarningDiagnosticsEnabled: flag(
    "NODE_WARNING_DIAGNOSTICS_ENABLED",
    false,
  ),
  globalChatAdminUserIds: commaSeparatedConfig(
    "GLOBAL_CHAT_ADMIN_USER_IDS",
  ).pipe(Config.withDefault([])),
  hostName: Config.option(Config.String("HOSTNAME")).pipe(
    Config.map(Option.getOrUndefined),
  ),
}).pipe(
  Config.map(({ base, ...api }) => ({
    ...base,
    ...api,
    isLocal: base.environment === RuntimeEnvironment.LOCAL,
  })),
);
