import { apiKey, API_KEY_ERROR_CODES } from "@better-auth/api-key";
import { DISCORD_AUTH_SCOPES } from "@lootlog/schema/discord";
import { WEB_SIGN_IN_ERROR_PATH } from "@lootlog/domain/public-sites";
import type { AuthProvider } from "#src/auth/auth-service";
import { runLogEffect } from "@lootlog/instrumentation";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getCookies } from "better-auth/cookies";
import { admin } from "better-auth/plugins/admin";
import { bearer } from "better-auth/plugins/bearer";
import { jwt } from "better-auth/plugins/jwt";
import { Context, Effect, Layer, Schema } from "effect";
import { AppConfig, reveal, type AuthConfig } from "#src/config/env";
import { PostgresPool } from "#src/database/postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import { betterAuthSchema } from "#src/database/drizzle.schema";
import { AuthRedisStorage } from "#src/auth/storage/auth-redis-storage";
import { resolveBetterAuthBaseURL } from "./better-auth-url.js";
import { createDiscordAuthOptions } from "./discord-auth-options.js";

const logBetterAuthEvent = (
  level: Parameters<
    NonNullable<NonNullable<BetterAuthOptions["logger"]>["log"]>
  >[0],
  message: unknown,
  error?: unknown,
) => {
  const severity = {
    debug: "Debug",
    info: "Info",
    warn: "Warn",
    error: "Error",
  } as const;

  const errorCode =
    message === "Failed to validate API key:" && error instanceof APIError
      ? error.body?.code
      : undefined;

  const code =
    Schema.is(Schema.String)(errorCode) &&
    Object.hasOwn(API_KEY_ERROR_CODES, errorCode)
      ? errorCode
      : undefined;

  runLogEffect(
    Effect.logWithLevel(severity[level])(
      Schema.is(Schema.String)(message) && message.trim() !== ""
        ? message
        : "Authentication event",
      code === undefined
        ? { context: "BetterAuth" }
        : { context: "BetterAuth", code },
    ),
  );
};

export const betterAuthLogger = {
  log: logBetterAuthEvent,
} satisfies BetterAuthOptions["logger"];

const OAUTH_CALLBACK_ERROR_CODE = /^[A-Za-z0-9_]{1,64}$/u;

export const logOAuthCallbackError = createAuthMiddleware((ctx) => {
  const location =
    ctx.path === "/callback/:id" && !ctx.context.newSession
      ? ctx.context.responseHeaders?.get("location")
      : undefined;

  const error = location
    ? (URL.parse(location, ctx.context.baseURL)?.searchParams.get("error") ??
      null)
    : null;

  if (error !== null)
    runLogEffect(
      Effect.logWarning("OAuth callback failed").pipe(
        Effect.annotateLogs({
          context: "BetterAuth",
          code: OAUTH_CALLBACK_ERROR_CODE.test(error) ? error : "unrecognized",
        }),
      ),
    );

  return Promise.resolve();
});

export const createLootlogAuth = ({
  config,
  database,
  secondaryStorage,
  refreshCoordination,
}: {
  readonly config: AuthConfig;
  readonly database: ReturnType<typeof drizzle>;
  readonly secondaryStorage?: AuthRedisStorage["Service"]["secondaryStorage"];
  readonly refreshCoordination?: AuthRedisStorage["Service"]["refreshCoordination"];
}) => {
  const betterAuthBaseURL = resolveBetterAuthBaseURL(config.appUrl);

  const discordAuthOptions = createDiscordAuthOptions({
    clientId: config.discordClientId,
    clientSecret: reveal(config.discordClientSecret),
    redirectURI: `${betterAuthBaseURL}/callback/discord`,
    scopes: [...DISCORD_AUTH_SCOPES],
    ...(refreshCoordination !== undefined && { refreshCoordination }),
  });

  const storageOptions: Pick<BetterAuthOptions, "secondaryStorage"> = {};

  if (secondaryStorage !== undefined)
    storageOptions.secondaryStorage = secondaryStorage;

  return betterAuth({
    appName: "@lootlog/auth",
    logger: betterAuthLogger,
    hooks: { after: logOAuthCallbackError },
    onAPIError: {
      errorURL: new URL(WEB_SIGN_IN_ERROR_PATH, config.webAppUrl).toString(),
    },
    baseURL: betterAuthBaseURL,
    database: drizzleAdapter(database, {
      provider: "pg",
      schema: betterAuthSchema,
      transaction: true,
    }),
    ...storageOptions,
    ...discordAuthOptions,
    account: { ...discordAuthOptions.account, encryptOAuthTokens: true },
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
      apiKey({
        references: "user",
        enableSessionForAPIKeys: false,
        defaultPrefix: "ll_",
        requireName: true,
        maximumNameLength: 80,
        enableMetadata: true,
        rateLimit: { enabled: false },
        keyExpiration: { defaultExpiresIn: null },
      }),
      jwt({
        disableSettingJwtHeader: true,
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

export const toAuthProvider = (auth: LootlogAuth) => {
  const cookies = getCookies(auth.options);

  return {
    ...auth,
    apiKeys: auth.api,
    accounts: {
      getFreshSession: async (headers: Headers) => {
        const session = await auth.api.getSession({
          headers: new Headers({ cookie: headers.get("cookie") ?? "" }),
          query: { disableCookieCache: true },
        });

        return session
          ? { userId: session.user.id, name: session.user.name }
          : null;
      },
      updateUser: async (
        userId: string,
        data: Partial<
          Pick<
            typeof betterAuthSchema.user.$inferSelect,
            "role" | "banned" | "banReason" | "banExpires"
          >
        >,
      ) => {
        const { internalAdapter } = await auth.$context;
        await internalAdapter.updateUser(userId, data);
      },
      revokeSessions: async (userId: string) => {
        const { internalAdapter } = await auth.$context;
        await internalAdapter.deleteUserSessions(userId);
      },
      revokeSession: async (token: string) => {
        const { internalAdapter } = await auth.$context;
        await internalAdapter.deleteSession(token);
      },
    },
    sessionCookieNames: {
      token: cookies.sessionToken.name,
      data: cookies.sessionData.name,
    },
    api: {
      ...auth.api,
      getSessionWithCookies: async ({ headers }: { headers: Headers }) => {
        const { headers: responseHeaders, response } =
          await auth.api.getSession({ headers, returnHeaders: true });

        return {
          session: response,
          setCookie: responseHeaders.getSetCookie(),
        };
      },
    },
  };
};

export class BetterAuthRuntime extends Context.Service<
  BetterAuthRuntime,
  AuthProvider &
    Pick<LootlogAuth, "handler"> & {
      readonly apiKeys?: Pick<LootlogAuth["api"], "createApiKey">;
      readonly accounts?: ReturnType<typeof toAuthProvider>["accounts"];
      readonly options: Pick<LootlogAuth["options"], "baseURL">;
    }
>()("@lootlog/auth/BetterAuthRuntime") {
  static readonly layer = Layer.effect(
    BetterAuthRuntime,
    Effect.gen(function* () {
      const config = yield* AppConfig;
      const pool = yield* PostgresPool;
      const redis = yield* AuthRedisStorage;

      const auth = createLootlogAuth({
        config,
        database: drizzle({ client: pool }),
        secondaryStorage: redis.secondaryStorage,
        refreshCoordination: redis.refreshCoordination,
      });

      return BetterAuthRuntime.of(toAuthProvider(auth));
    }),
  );
}

export type AppUserSession = LootlogAuth["$Infer"]["Session"];
