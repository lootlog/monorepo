import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, bearer, jwt } from "better-auth/plugins";
import { DISCORD_AUTH_SCOPES } from "@lootlog/types";
import { env } from "src/config/env";
import { betterAuthSchema, db } from "src/database/drizzle";

export const auth = betterAuth({
  appName: "@lootlog/auth",
  basePath: "/idp",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: betterAuthSchema,
  }),
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
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
    expiresIn: 60 * 60 * 24 * 365,
    updateAge: 60 * 60 * 24 * 30,
    freshAge: 0,
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 1,
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
        expirationTime: "365d",
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
