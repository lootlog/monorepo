import { Config, Context, Layer, Option, Redacted } from "effect";

const splitCommaSeparated = (value: string): string[] =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const optionalString = (name: string) => Config.option(Config.String(name));

export interface AuthConfig {
  readonly idpTokenSecret?: Redacted.Redacted<string>;
  readonly apiUrl?: string;
  readonly apiKeysEnabled?: boolean;
  readonly apiKeyStatusSecret?: Redacted.Redacted<string>;
  readonly environment: string;
  readonly port: number;
  readonly serviceName: string;
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
  readonly redis: {
    readonly host: string;
    readonly port: number;
    readonly username: string;
    readonly password: Redacted.Redacted<string>;
  };
  readonly serviceNamespace: string;
  readonly commitSha: string | undefined;
}

const authConfig = Config.all({
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
  environment: Config.Literals(["local", "dev", "staging", "prod"], "ENV").pipe(
    Config.withDefault("local"),
  ),
  port: Config.Int("PORT"),
  serviceName: Config.String("SERVICE_NAME").pipe(Config.withDefault("auth")),
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
  redis: Config.all({
    host: Config.String("REDIS_HOST"),
    port: Config.Int("REDIS_PORT"),
    username: Config.String("REDIS_USERNAME"),
    password: Config.Redacted("REDIS_PASSWORD"),
  }),
  serviceNamespace: Config.String("SERVICE_NAMESPACE").pipe(
    Config.withDefault("local"),
  ),
  commitSha: optionalString("COMMIT_SHA").pipe(
    Config.map(Option.getOrUndefined),
  ),
});

export class AppConfig extends Context.Service<AppConfig, AuthConfig>()(
  "@lootlog/auth/AppConfig",
) {
  static readonly layer = Layer.effect(AppConfig, authConfig);
}

export const reveal = Redacted.value;
