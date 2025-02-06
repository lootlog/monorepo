import "dotenv/config";
import { z } from "zod";

const configSchema = z.object({
  PORT: z.string().transform(Number),
  BETTER_AUTH_URL: z.string(),
  POSTGRESQL_HOST: z.string(),
  POSTGRESQL_PORT: z.string().transform(Number),
  POSTGRESQL_USER: z.string(),
  POSTGRESQL_PASSWORD: z.string(),
  POSTGRESQL_DATABASE: z.string(),
  DISCORD_CLIENT_ID: z.string(),
  DISCORD_CLIENT_SECRET: z.string(),
});

const {
  PORT,
  BETTER_AUTH_URL,
  POSTGRESQL_DATABASE,
  POSTGRESQL_HOST,
  POSTGRESQL_PASSWORD,
  POSTGRESQL_PORT,
  POSTGRESQL_USER,
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
} = configSchema.parse(process.env);

export const APP_CONFIG = {
  port: PORT,
  betterAuthUrl: BETTER_AUTH_URL,
  postgres: {
    host: POSTGRESQL_HOST,
    port: POSTGRESQL_PORT,
    user: POSTGRESQL_USER,
    password: POSTGRESQL_PASSWORD,
    database: POSTGRESQL_DATABASE,
  },
  discord: {
    clientId: DISCORD_CLIENT_ID,
    clientSecret: DISCORD_CLIENT_SECRET,
  },
};
