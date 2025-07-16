import { betterAuth } from "better-auth";

import { PostgresDialect } from "kysely";

import { APP_CONFIG } from "../config/app.config.js";
import pg from "pg";
import { admin, bearer, jwt } from "better-auth/plugins";

const { user, password, port, host, database } = APP_CONFIG.postgres;
const { clientId, clientSecret } = APP_CONFIG.discord;

const poolConfig = {
  user,
  password,
  host,
  port,
  database,
  ssl: APP_CONFIG.postgres.sslCa
    ? {
        ca: APP_CONFIG.postgres.sslCa,
      }
    : undefined,
};

const dialect = new PostgresDialect({
  pool: new pg.Pool(poolConfig),
});

export const auth: any = betterAuth({
  appName: "@lootlog/auth",
  basePath: "/idp",
  database: {
    dialect,
    type: "postgres",
  },
  user: {
    additionalFields: {
      discordId: {
        type: "string",
        required: true,
        input: false,
      },
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
    expiresIn: 60 * 60 * 24 * 365, // 1 year
    updateAge: 60 * 60 * 24 * 30, // 30 days
    freshAge: 0,
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 1,
  },
  trustedOrigins: APP_CONFIG.trustedOrigins,
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
    },
    crossSubDomainCookies: {
      enabled: true,
      domain: APP_CONFIG.cookieDomain,
    },
    ipAddress: {
      ipAddressHeaders: ["cf-connecting-ip"],
    },
    cookiePrefix: APP_CONFIG.cookiePrefix,
  },
  plugins: [
    jwt({
      jwt: {
        issuer: APP_CONFIG.appUrl,
        audience: APP_CONFIG.appUrl,
        expirationTime: "365d",
        definePayload: ({ user }) => {
          return {
            id: user.id,
            email: user.email,
            role: user.role,
            discordId: user.discordId,
          };
        },
      },
    }),
    bearer(),
    admin({ adminUserIds: APP_CONFIG.adminAccountIds }),
  ],
  socialProviders: {
    discord: {
      clientId,
      clientSecret,
      redirectURI: `${APP_CONFIG.appUrl}/idp/callback/discord`,
      scopes: ["identify", "email", "guilds"],
      mapProfileToUser: (profile) => {
        return {
          firstName: profile.given_name,
          lastName: profile.family_name,
          discordId: profile.id,
        };
      },
    },
  },
});
