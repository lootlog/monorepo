import { RuntimeEnvironment } from "@lootlog/types";
import "dotenv/config";
import { z } from "zod";

const configSchema = z.object({
  PORT: z.string().transform(Number),
  ENV: z.nativeEnum(RuntimeEnvironment),
  JWKS_URL: z.string(),
  MEILISEARCH_HOST: z.string(),
  MEILISEARCH_API_KEY: z.string(),
  RABBITMQ_URI: z.string(),
});

const {
  PORT,
  JWKS_URL,
  MEILISEARCH_API_KEY,
  MEILISEARCH_HOST,
  ENV,
  RABBITMQ_URI,
} = configSchema.parse(process.env);

export const APP_CONFIG = {
  port: PORT,
  jwksUrl: JWKS_URL,
  env: ENV,
  meilisearch: {
    host: MEILISEARCH_HOST,
    apiKey: MEILISEARCH_API_KEY,
  },
  rabbitmq: {
    uri: RABBITMQ_URI,
    exchange: "default",
  },
};
