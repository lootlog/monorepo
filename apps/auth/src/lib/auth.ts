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
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 1,
  },
  trustedOrigins: ["http://localhost"],
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
    },
  },
  plugins: [
    jwt({
      jwt: {
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
