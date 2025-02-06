import "dotenv/config";
import { z } from "zod";

const configSchema = z.object({
  PORT: z.string().transform(Number),
  JWKS_URL: z.string(),
});

const { PORT, JWKS_URL } = configSchema.parse(process.env);

export const APP_CONFIG = {
  port: PORT,
  jwksUrl: JWKS_URL,
};
