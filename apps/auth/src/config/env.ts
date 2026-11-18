import {
  baseServiceConfig,
  type BaseServiceConfiguration,
  redisUrlConfig,
} from "@lootlog/instrumentation/service-config";
import { Config, Context, Layer, Option, Redacted } from "effect";

const splitCommaSeparated = (value: string): string[] =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const optionalString = (name: string) => Config.option(Config.String(name));

export interface AuthConfig extends BaseServiceConfiguration {
  readonly idpTokenSecret?: Redacted.Redacted<string>;
  readonly apiUrl?: string;
  readonly apiKeysEnabled?: boolean;
  readonly apiKeyStatusSecret?: Redacted.Redacted<string>;
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
  idpTokenSecret: Config.option(Config.Redacted("AUTH_IDP_TOKEN_SECRET")).pipe(
    Config.map(Option.getOrUndefined),
  ),
  apiUrl: Config.option(Config.String("API_URL")).pipe(
    Config.map(Option.getOrUndefined),
  ),
  apiKeysEnabled: Config.Boolean("API_KEYS_ENABLED").pipe(
    Config.withDefault(false),
  ),
  apiKeyStatusSecret: Config.option(
    Config.Redacted("API_KEY_STATUS_SECRET"),
  ).pipe(Config.map(Option.getOrUndefined)),
  trustedOrigins: Config.String("TRUSTED_ORIGINS").pipe(
    Config.map(splitCommaSeparated),
  ),
  cookieDomain: Config.String("COOKIE_DOMAIN"),
  cookiePrefix: Config.String("COOKIE_PREFIX"),
  adminAccountIds: Config.String("ADMIN_ACCOUNT_IDS").pipe(
    Config.map(splitCommaSeparated),
  ),
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
