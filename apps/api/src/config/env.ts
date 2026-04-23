import "dotenv/config";
import { z } from "zod";
import { createEnv } from "@lootlog/nest-shared/config";
import { RuntimeEnvironment } from "src/types/runtime.types";

const booleanEnv = z
  .string()
  .optional()
  .transform((value) => {
    if (!value) {
      return false;
    }

    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  });

export const env = createEnv(
  z.object({
    ENV: z.nativeEnum(RuntimeEnvironment).default(RuntimeEnvironment.LOCAL),
    PORT: z.coerce.number(),
    SERVICE_NAME: z.string().default("api"),
    POSTGRESQL_CONNECTION_URI: z.string().optional(),
    RABBITMQ_URI: z.string(),
    AXIOM_DATASET: z.string().optional(),
    AXIOM_TOKEN: z.string().optional(),
    REDIS_HOST: z.string(),
    REDIS_PORT: z.coerce.number(),
    REDIS_PASSWORD: z.string(),
    REDIS_USERNAME: z.string(),
    AUTH_SERVICE_URL: z.string(),
    BATTLELOG_SERVICE_URL: z.string().default("http://battlelog-service:4000"),
    DISCORD_BOT_SERVICE_URL: z.string().default("http://discord-bot:4000"),
    RESERVATIONS_CARDS_URL: z.string().url(),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
    OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
    OTEL_NODE_RESOURCE_DETECTORS: z.string().default("env,host,os,process"),
    OTEL_TRACES_EXPORTER: z.string().default("otlp"),
    SERVICE_NAMESPACE: z.string().default("local"),
    MAPS_API_URL: z.string().url(),
    TIMER_CLEANUP_ENABLED: z.string().default("true"),
    TIMER_RETENTION_DAYS: z.coerce.number().default(7),
    RESERVATIONS_CLEANUP_ENABLED: z.string().default("true"),
    RESERVATIONS_RETENTION_DAYS: z.coerce.number().default(30),
    PERF_DIAGNOSTICS_ENABLED: booleanEnv.default(false),
    PERF_DIAGNOSTICS_THRESHOLD_MS: z.coerce.number().positive().default(50),
    PERF_DIAGNOSTICS_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(1),
    NODE_WARNING_DIAGNOSTICS_ENABLED: booleanEnv.default(false),
  }),
);
