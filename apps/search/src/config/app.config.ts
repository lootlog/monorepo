import "dotenv/config";
import { z } from "zod";

const configSchema = z.object({
  PORT: z.string().transform(Number),
  JWKS_URL: z.string(),
  MEILISEARCH_HOST: z.string(),
  MEILISEARCH_API_KEY: z.string(),
});

const { PORT, JWKS_URL, MEILISEARCH_API_KEY, MEILISEARCH_HOST } =
  configSchema.parse(process.env);

export const APP_CONFIG = {
  port: PORT,
  jwksUrl: JWKS_URL,
  meilisearch: {
    host: MEILISEARCH_HOST,
    apiKey: MEILISEARCH_API_KEY,
  },
};
