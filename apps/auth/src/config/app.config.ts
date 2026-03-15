import "dotenv/config";
import { z } from "zod";
import { RuntimeEnvironment } from "@lootlog/types";

const configSchema = z.object({
  PORT: z.string().transform(Number),
  ENV: z.nativeEnum(RuntimeEnvironment),
  TRUSTED_ORIGINS: z.string().transform((val) => val.split(",")),
  APP_URL: z.string(),
  POSTGRESQL_HOST: z.string(),
  POSTGRESQL_PORT: z.string().transform(Number),
  POSTGRESQL_USER: z.string(),
  POSTGRESQL_PASSWORD: z.string(),
  POSTGRESQL_DATABASE: z.string(),
  DISCORD_CLIENT_ID: z.string(),
  DISCORD_CLIENT_SECRET: z.string(),
  POSTGRESQL_SSL_CA: z.string().optional(),
  COOKIE_DOMAIN: z.string(),
  COOKIE_PREFIX: z.string(),
  ADMIN_ACCOUNT_IDS: z.string().transform((val) => val.split(",")),
  AUTH_SECRET: z.string(),
  AXIOM_DATASET: z.string().optional(),
  AXIOM_TOKEN: z.string().optional(),
  COMMIT_SHA: z.string().optional(),
});

const {
  PORT,
  ENV,
  APP_URL,
  POSTGRESQL_DATABASE,
  POSTGRESQL_HOST,
  POSTGRESQL_PASSWORD,
  POSTGRESQL_PORT,
  POSTGRESQL_USER,
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  TRUSTED_ORIGINS,
  POSTGRESQL_SSL_CA,
  COOKIE_DOMAIN,
  COOKIE_PREFIX,
  ADMIN_ACCOUNT_IDS,
  AUTH_SECRET,
} = configSchema.parse(process.env);

export const APP_CONFIG = {
  port: PORT,
  env: ENV,
  trustedOrigins: TRUSTED_ORIGINS,
  appUrl: APP_URL,
  jwksUrl: `${APP_URL}/api/auth/idp/jwks`,
  cookieDomain: COOKIE_DOMAIN,
  cookiePrefix: COOKIE_PREFIX,
  adminAccountIds: ADMIN_ACCOUNT_IDS,
  authSecret: AUTH_SECRET,
  postgres: {
    host: POSTGRESQL_HOST,
    port: POSTGRESQL_PORT,
    user: POSTGRESQL_USER,
    password: POSTGRESQL_PASSWORD,
    database: POSTGRESQL_DATABASE,
    sslCa: POSTGRESQL_SSL_CA || undefined,
  },
  discord: {
    clientId: DISCORD_CLIENT_ID,
    clientSecret: DISCORD_CLIENT_SECRET,
  },
};
