import "dotenv/config";
import { Config, Context, Layer, Option, Redacted } from "effect";

const splitCommaSeparated = (value: string): string[] =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const optionalString = (name: string) => Config.option(Config.string(name));

export interface AuthConfig {
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
  environment: Config.literals(["local", "dev", "staging", "prod"], "ENV").pipe(
    Config.withDefault("local"),
  ),
  port: Config.int("PORT"),
  serviceName: Config.string("SERVICE_NAME").pipe(Config.withDefault("auth")),
  trustedOrigins: Config.string("TRUSTED_ORIGINS").pipe(
    Config.map(splitCommaSeparated),
  ),
  cookieDomain: Config.string("COOKIE_DOMAIN"),
  cookiePrefix: Config.string("COOKIE_PREFIX"),
  adminAccountIds: Config.string("ADMIN_ACCOUNT_IDS").pipe(
    Config.map(splitCommaSeparated),
  ),
  authSecret: Config.redacted("AUTH_SECRET"),
  appUrl: Config.string("APP_URL"),
  postgresql: Config.all({
    host: Config.string("POSTGRESQL_HOST"),
    port: Config.int("POSTGRESQL_PORT"),
    user: Config.string("POSTGRESQL_USER"),
    password: Config.redacted("POSTGRESQL_PASSWORD"),
    database: Config.string("POSTGRESQL_DATABASE"),
    sslCa: optionalString("POSTGRESQL_SSL_CA").pipe(
      Config.map(Option.getOrUndefined),
    ),
  }),
  discordClientId: Config.string("DISCORD_CLIENT_ID"),
  discordClientSecret: Config.redacted("DISCORD_CLIENT_SECRET"),
  redis: Config.all({
    host: Config.string("REDIS_HOST"),
    port: Config.int("REDIS_PORT"),
    username: Config.string("REDIS_USERNAME"),
    password: Config.redacted("REDIS_PASSWORD"),
  }),
  serviceNamespace: Config.string("SERVICE_NAMESPACE").pipe(
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
