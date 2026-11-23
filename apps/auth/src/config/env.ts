import {
  baseServiceConfig,
  type BaseServiceConfiguration,
  commaSeparatedConfig,
  redisUrlConfig,
} from "@lootlog/instrumentation/service-config";
import { AuthServedRpcGroup } from "@lootlog/rpc/auth";
import {
  type CallerTokens,
  type RpcUpstream,
  rpcCallerTokensConfig,
  rpcUpstreamConfig,
} from "@lootlog/rpc/callers";
import { rpcPortConfig } from "@lootlog/rpc/server";
import { Config, Context, Layer, Option, Redacted } from "effect";

const optionalString = (name: string) => Config.option(Config.String(name));

export interface AuthConfig extends BaseServiceConfiguration {
  readonly rpc: {
    readonly port: number;
    readonly callerTokens: CallerTokens;
    readonly api: RpcUpstream;
  };
  readonly apiKeysEnabled?: boolean;
  readonly trustedOrigins: ReadonlyArray<string>;
  readonly cookieDomain: string;
  readonly cookiePrefix: string;
  readonly adminAccountIds: ReadonlyArray<string>;
  readonly authSecret: Redacted.Redacted<string>;
  readonly appUrl: string;
  readonly postgresql: {
    readonly host: string;
    readonly port: number;
    readonly user: string;
    readonly password: Redacted.Redacted<string>;
    readonly database: string;
    readonly sslCa: string | undefined;
  };
  readonly discordClientId: string;
  readonly discordClientSecret: Redacted.Redacted<string>;
  readonly redisUrl: Redacted.Redacted<string>;
  readonly commitSha: string | undefined;
}

const authConfig: Config.Config<AuthConfig> = Config.all({
  base: baseServiceConfig("auth"),
  rpc: Config.all({
    port: rpcPortConfig,
    callerTokens: rpcCallerTokensConfig("auth", AuthServedRpcGroup),
    api: rpcUpstreamConfig("auth", "api"),
  }),
  apiKeysEnabled: Config.Boolean("API_KEYS_ENABLED").pipe(
    Config.withDefault(false),
  ),
  trustedOrigins: commaSeparatedConfig("TRUSTED_ORIGINS"),
  cookieDomain: Config.String("COOKIE_DOMAIN"),
  cookiePrefix: Config.String("COOKIE_PREFIX"),
  adminAccountIds: commaSeparatedConfig("ADMIN_ACCOUNT_IDS"),
  authSecret: Config.Redacted("AUTH_SECRET"),
  appUrl: Config.String("APP_URL"),
  postgresql: Config.all({
    host: Config.String("POSTGRESQL_HOST"),
    port: Config.Int("POSTGRESQL_PORT"),
    user: Config.String("POSTGRESQL_USER"),
    password: Config.Redacted("POSTGRESQL_PASSWORD"),
    database: Config.String("POSTGRESQL_DATABASE"),
    sslCa: optionalString("POSTGRESQL_SSL_CA").pipe(
      Config.map(Option.getOrUndefined),
    ),
  }),
  discordClientId: Config.String("DISCORD_CLIENT_ID"),
  discordClientSecret: Config.Redacted("DISCORD_CLIENT_SECRET"),
  redisUrl: redisUrlConfig,
  commitSha: optionalString("COMMIT_SHA").pipe(
    Config.map(Option.getOrUndefined),
  ),
}).pipe(Config.map(({ base, ...config }) => ({ ...base, ...config })));

export class AppConfig extends Context.Service<AppConfig, AuthConfig>()(
  "@lootlog/auth/AppConfig",
) {
  static readonly layer = Layer.effect(AppConfig, authConfig);
}

export const reveal = Redacted.value;
