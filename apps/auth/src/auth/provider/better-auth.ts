import type { AuthProvider } from "#src/auth/auth-service";
import { runLogEffect } from "@lootlog/instrumentation";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { bearer } from "better-auth/plugins/bearer";
import { jwt } from "better-auth/plugins/jwt";
import { Context, Effect, Layer, Schema } from "effect";
import { AppConfig, reveal, type AuthConfig } from "#src/config/env";
import { PostgresPool } from "@lootlog/database";
import { drizzle } from "drizzle-orm/node-postgres";
import { betterAuthSchema } from "#src/database/drizzle.schema";
import { AuthRedisStorage } from "#src/auth/storage/auth-redis-storage";
import { resolveBetterAuthBaseURL } from "./better-auth-url.js";
import { createDiscordAuthOptions } from "./discord-auth-options.js";

export const DISCORD_AUTH_SCOPES = [
  "guilds.members.read",
  "guilds",
  "identify",
  "email",
] as const;

const logBetterAuthEvent = (
  level: Parameters<
    NonNullable<NonNullable<BetterAuthOptions["logger"]>["log"]>
  >[0],
  message: unknown,
) => {
  const severity = {
    debug: "Debug",
    info: "Info",
    warn: "Warn",
    error: "Error",
  } as const;
  // Better Auth details may contain OAuth input or database query parameters.
  runLogEffect(
    Effect.logWithLevel(severity[level])(
      Schema.is(Schema.String)(message) && message.trim() !== ""
        ? message
        : "Authentication event",
      { context: "BetterAuth" },
    ),
  );
};
export const betterAuthLogger = {
  log: logBetterAuthEvent,
} satisfies BetterAuthOptions["logger"];

export const createLootlogAuth = ({
  config,
  database,
  secondaryStorage,
}: {
  readonly config: AuthConfig;
  readonly database: ReturnType<typeof drizzle>;
  readonly secondaryStorage?: AuthRedisStorage["Service"]["secondaryStorage"];
}) => {
  const betterAuthBaseURL = resolveBetterAuthBaseURL(config.appUrl);
  const discordAuthOptions = createDiscordAuthOptions({
    clientId: config.discordClientId,
    clientSecret: reveal(config.discordClientSecret),
    redirectURI: `${betterAuthBaseURL}/callback/discord`,
    scopes: [...DISCORD_AUTH_SCOPES],
  });

  const storageOptions: Pick<BetterAuthOptions, "secondaryStorage"> = {};
  if (secondaryStorage !== undefined)
    storageOptions.secondaryStorage = secondaryStorage;

  return betterAuth({
    appName: "@lootlog/auth",
    logger: betterAuthLogger,
    baseURL: betterAuthBaseURL,
    database: drizzleAdapter(database, {
      provider: "pg",
      schema: betterAuthSchema,
      transaction: true,
    }),
    account: {
      encryptOAuthTokens: true,
      identityStrategy: "provider-id",
      accountLinking: {
        enabled: true,
        disableImplicitLinking: false,
        allowDifferentEmails: false,
        updateUserInfoOnLink: true,
      },
    },
    ...storageOptions,
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
  AuthProvider &
    Pick<LootlogAuth, "handler"> & {
      readonly options: Pick<LootlogAuth["options"], "baseURL">;
    }
>()("@lootlog/auth/BetterAuthRuntime") {
  static readonly layer = Layer.effect(
    BetterAuthRuntime,
    Effect.gen(function* () {
      const config = yield* AppConfig;
      const pool = yield* PostgresPool;
      const redis = yield* AuthRedisStorage;

      return BetterAuthRuntime.of(
        createLootlogAuth({
          config,
          // Better Auth requires Promise-based Drizzle; reuse the Effect-owned pool.
          database: drizzle({ client: pool }),
          secondaryStorage: redis.secondaryStorage,
        }),
      );
    }),
  );
}

export type AppUserSession = LootlogAuth["$Infer"]["Session"];
