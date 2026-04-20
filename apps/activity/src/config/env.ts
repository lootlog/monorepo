import "dotenv/config";
import { z } from "zod";
import { RuntimeEnvironment } from "@lootlog/types";
import { createEnv } from "@lootlog/nest-shared/config";

export const env = createEnv(
  z.object({
    ENV: z.nativeEnum(RuntimeEnvironment).default(RuntimeEnvironment.LOCAL),
    PORT: z.coerce.number(),
    SERVICE_NAME: z.string().default("activity"),
    APP_VERSION: z.string(),
    POSTGRESQL_CONNECTION_URI: z.string().optional(),
    RABBITMQ_URI: z.string(),
    AXIOM_DATASET: z.string().optional(),
    AXIOM_TOKEN: z.string().optional(),
    REDIS_HOST: z.string(),
    REDIS_PORT: z.coerce.number(),
    REDIS_PASSWORD: z.string(),
    REDIS_USERNAME: z.string(),
    API_SERVICE_URL: z.string().url(),
  }),
);
