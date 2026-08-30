import "dotenv/config";
import { z } from "zod";
import { createEnv } from "@lootlog/nest-shared/config";
import { RuntimeEnvironment } from "@lootlog/types";

export const env = createEnv(
  z.object({
    ENV: z.nativeEnum(RuntimeEnvironment).default(RuntimeEnvironment.LOCAL),
    PORT: z.coerce.number(),
    SERVICE_NAME: z.string().default("search"),
    MEILISEARCH_HOST: z.string(),
    MEILISEARCH_API_KEY: z.string(),
    RABBITMQ_URI: z.string(),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
    OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
    OTEL_NODE_RESOURCE_DETECTORS: z.string().default("env,host,os,process"),
    OTEL_TRACES_EXPORTER: z.string().default("otlp"),
    SERVICE_NAMESPACE: z.string().default("local"),
    COMMIT_SHA: z.string().optional(),
  }),
);
