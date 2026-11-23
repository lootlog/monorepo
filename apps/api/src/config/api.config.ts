import {
  type BaseServiceConfiguration,
  baseServiceConfig,
  redisUrlConfig,
} from "@lootlog/instrumentation/service-config";
import { ApiRpcGroup } from "@lootlog/rpc/api";
import {
  type CallerTokens,
  type RpcUpstream,
  rpcCallerTokensConfig,
  rpcUpstreamConfig,
} from "@lootlog/rpc/callers";
import { rpcPortConfig } from "@lootlog/rpc/server";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { Config, Option, type Redacted, Schema } from "effect";

const flag = (name: string, defaultValue: boolean) =>
  Config.Boolean(name).pipe(Config.withDefault(defaultValue));

export const rabbitmqUriConfig = Config.Redacted("RABBITMQ_URI");

export const databaseUrlConfig = Config.Redacted("POSTGRESQL_CONNECTION_URI");

export interface ApiConfiguration extends BaseServiceConfiguration {
  readonly rpc: {
    readonly port: number;
    readonly callerTokens: CallerTokens;
    readonly auth: RpcUpstream;
    readonly discordBot: RpcUpstream;
  };
  readonly isLocal: boolean;
  readonly rabbitmqUri: Redacted.Redacted<string>;
  readonly redisUrl: Redacted.Redacted<string>;
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
  rpc: Config.all({
    port: rpcPortConfig,
    callerTokens: rpcCallerTokensConfig("api", ApiRpcGroup),
    auth: rpcUpstreamConfig("api", "auth"),
    discordBot: rpcUpstreamConfig("api", "discord-bot"),
  }),
  rabbitmqUri: rabbitmqUriConfig,
  redisUrl: redisUrlConfig,
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
