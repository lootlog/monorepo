import "dotenv/config";
import { z } from "zod";
import { createEnv } from "@lootlog/nest-shared/config";
import { RuntimeEnvironment } from "@lootlog/types";

export const env = createEnv(
  z.object({
    ENV: z.nativeEnum(RuntimeEnvironment).default(RuntimeEnvironment.LOCAL),
    PORT: z.coerce.number(),
    SERVICE_NAME: z.string().default("battlelog-service"),
    POSTGRESQL_CONNECTION_URI: z.string().optional(),
    AXIOM_DATASET: z.string().optional(),
    AXIOM_TOKEN: z.string().optional(),
    REDIS_HOST: z.string(),
    REDIS_PORT: z.coerce.number(),
    REDIS_PASSWORD: z.string(),
    REDIS_USERNAME: z.string(),
    R2_ACCESS_KEY_ID: z.string(),
    R2_SECRET_ACCESS_KEY: z.string(),
    R2_ENDPOINT: z.string(),
    R2_REGION: z.string().default("auto"),
    R2_BUCKET_NAME: z.string(),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
    OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
    OTEL_NODE_RESOURCE_DETECTORS: z.string().default("env,host,os,process"),
    OTEL_TRACES_EXPORTER: z.string().default("otlp"),
    SERVICE_NAMESPACE: z.string().default("local"),
  }),
);
