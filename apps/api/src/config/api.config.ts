import {
  type BaseServiceConfiguration,
  baseServiceConfig,
  redisUrlConfig,
} from "@lootlog/instrumentation/service-config";
import { DEFAULT_RPC_PORT } from "@lootlog/rpc/server";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { Config, Option, type Redacted, Schema } from "effect";

const flag = (name: string, defaultValue: boolean) =>
  Config.Boolean(name).pipe(Config.withDefault(defaultValue));

export const rabbitmqUriConfig = Config.Redacted("RABBITMQ_URI");

export const databaseUrlConfig = Config.Redacted("POSTGRESQL_CONNECTION_URI");

export interface ApiConfiguration extends BaseServiceConfiguration {
  readonly rpcPort: number;
  readonly isLocal: boolean;
  readonly rabbitmqUri: Redacted.Redacted<string>;
  readonly redisUrl: Redacted.Redacted<string>;
  readonly authRpcUrl: URL;
  readonly discordBotRpcUrl: URL;
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
  readonly hostName: string | undefined;
}

export const apiConfiguration: Config.Config<ApiConfiguration> = Config.all({
  base: baseServiceConfig("api"),
  rpcPort: Config.Int("RPC_PORT").pipe(Config.withDefault(DEFAULT_RPC_PORT)),
  rabbitmqUri: rabbitmqUriConfig,
  redisUrl: redisUrlConfig,
  authRpcUrl: Config.schema(Schema.URLFromString, "AUTH_RPC_URL"),
  discordBotRpcUrl: Config.schema(
    Schema.URLFromString,
    "DISCORD_BOT_RPC_URL",
  ).pipe(Config.withDefault(new URL("http://discord-bot:4001"))),
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
