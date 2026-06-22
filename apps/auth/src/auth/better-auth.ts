import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, bearer, jwt } from "better-auth/plugins";
import { DISCORD_AUTH_SCOPES } from "@lootlog/types";
import { env } from "src/config/env";
import { betterAuthSchema, db } from "src/database/drizzle";
import { authRedisSecondaryStorage } from "./auth-redis-storage";

export const auth = betterAuth({
  appName: "@lootlog/auth",
  // baseURL: env.APP_URL,
  basePath: "/idp",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: betterAuthSchema,
  }),
  secondaryStorage: authRedisSecondaryStorage,
  account: {
    encryptOAuthTokens: true,
  },
  user: {
    additionalFields: {
      discordId: {
        type: "string",
        required: true,
        input: false,
      },
    },
    deleteUser: {
      enabled: true,
    },
  },
  secret: env.AUTH_SECRET,
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
  trustedOrigins: env.TRUSTED_ORIGINS,
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
    },
    crossSubDomainCookies: {
      enabled: true,
      domain: env.COOKIE_DOMAIN,
    },
    ipAddress: {
      ipAddressHeaders: ["cf-connecting-ip"],
    },
    cookiePrefix: env.COOKIE_PREFIX,
  },
  plugins: [
    jwt({
      jwt: {
        issuer: env.APP_URL,
        audience: env.APP_URL,
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
    admin({ adminUserIds: env.ADMIN_ACCOUNT_IDS }),
  ],
  socialProviders: {
    discord: {
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
      redirectURI: `${env.APP_URL}/idp/callback/discord`,
      prompt: "consent",
      scopes: DISCORD_AUTH_SCOPES,
      mapProfileToUser: (profile) => ({
        firstName: profile.given_name,
        lastName: profile.family_name,
        discordId: profile.id,
      }),
    },
  },
});

export type AppUserSession = typeof auth.$Infer.Session;
