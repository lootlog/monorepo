import { betterAuth } from "better-auth";

import { PostgresDialect } from "kysely";

import { APP_CONFIG } from "../config/app.config.js";
import pg from "pg";
import { bearer, jwt } from "better-auth/plugins";

const { user, password, port, host, database } = APP_CONFIG.postgres;
const { clientId, clientSecret } = APP_CONFIG.discord;

const dialect = new PostgresDialect({
  pool: new pg.Pool({
    user,
    password,
    host,
    port,
    database,
  }),
});

export const auth = betterAuth({
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
      maxAge: 5 * 60, // Cache duration in seconds
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 1,
  },
  trustedOrigins: [
    "http://localhost",
    "https://gordion.margonem.pl",
    "https://fobos.margonem.pl",
  ],
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
    },
  },
  plugins: [
    jwt({
      jwt: {
        issuer: APP_CONFIG.auth.appUrl,
        audience: APP_CONFIG.auth.appUrl,
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
  ],
  socialProviders: {
    discord: {
      clientId,
      clientSecret,
      redirectURI: "http://localhost/api/auth/idp/callback/discord",
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
