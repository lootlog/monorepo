import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { bearer } from "better-auth/plugins/bearer";
import { jwt } from "better-auth/plugins/jwt";
import { Context, Effect, Layer } from "effect";
import { AppConfig, reveal, type AuthConfig } from "#src/config/env";
import {
  AuthDatabase,
  betterAuthSchema,
  type AuthDatabaseConnection,
} from "#src/database/drizzle";
import { AuthRedisStorage } from "./auth-redis-storage.js";
import { createDiscordAuthOptions } from "./discord-auth-options.js";

export const DISCORD_AUTH_SCOPES = [
  "guilds.members.read",
  "guilds",
  "identify",
  "email",
] as const;

export const createLootlogAuth = ({
  config,
  database,
  secondaryStorage,
}: {
  readonly config: AuthConfig;
  readonly database: AuthDatabaseConnection["db"];
  readonly secondaryStorage: AuthRedisStorage["Service"]["secondaryStorage"];
}) => {
  const discordAuthOptions = createDiscordAuthOptions({
    clientId: config.discordClientId,
    clientSecret: reveal(config.discordClientSecret),
    redirectURI: `${config.appUrl}/idp/callback/discord`,
    scopes: [...DISCORD_AUTH_SCOPES],
  });

  return betterAuth({
    appName: "@lootlog/auth",
    basePath: "/idp",
    database: drizzleAdapter(database, {
      provider: "pg",
      schema: betterAuthSchema,
    }),
    secondaryStorage,
    account: {
      encryptOAuthTokens: true,
    },
    ...discordAuthOptions,
    secret: reveal(config.authSecret),
    session: {
      storeSessionInDatabase: true,
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
        strategy: "compact",
      },
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      freshAge: 60 * 60 * 24,
    },
    trustedOrigins: [...config.trustedOrigins],
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
      },
      crossSubDomainCookies: {
        enabled: true,
        domain: config.cookieDomain,
      },
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip"],
      },
      cookiePrefix: config.cookiePrefix,
    },
    plugins: [
      jwt({
        jwt: {
          issuer: config.appUrl,
          audience: config.appUrl,
          expirationTime: "1h",
          definePayload: ({ user }) => ({
            id: user.id,
            email: user.email,
            role: user.role,
            discordId: user.discordId,
          }),
        },
      }),
      bearer(),
      admin({ adminUserIds: [...config.adminAccountIds] }),
    ],
  });
};

export type LootlogAuth = ReturnType<typeof createLootlogAuth>;

export class BetterAuthRuntime extends Context.Service<
  BetterAuthRuntime,
  LootlogAuth
>()("@lootlog/auth/BetterAuthRuntime") {
  static readonly layer = Layer.effect(
    BetterAuthRuntime,
    Effect.gen(function* () {
      const config = yield* AppConfig;
      const database = yield* AuthDatabase;
      const redis = yield* AuthRedisStorage;

      return BetterAuthRuntime.of(
        createLootlogAuth({
          config,
          database: database.db,
          secondaryStorage: redis.secondaryStorage,
        }),
      );
    }),
  );
}

export type AppUserSession = LootlogAuth["$Infer"]["Session"];
