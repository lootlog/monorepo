import { betterAuth } from "better-auth";

import { PostgresDialect } from "kysely";

import { APP_CONFIG } from "../config/app.config.js";
import pg from "pg";
import { bearer, jwt } from "better-auth/plugins";

const { user, password, port, host, database } = APP_CONFIG.postgres;

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
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 1,
  },
  trustedOrigins: ["http://localhost:5173"],
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
    },
  },
  plugins: [jwt(), bearer()],
  // socialProviders: {
  // 	discord: {
  // 		clientId: process.env.DISCORD_CLIENT_ID || "",
  // 		clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
  // 	},
  // },
});
