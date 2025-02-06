import "dotenv/config";
import { z } from "zod";

const configSchema = z.object({
  PORT: z.string().transform((val) => {
    return +val;
  }),
  BETTER_AUTH_URL: z.string(),
});

const { PORT, BETTER_AUTH_URL } = configSchema.parse(process.env);

export const APP_CONFIG = {
  port: PORT,
  betterAuthUrl: BETTER_AUTH_URL,
};
