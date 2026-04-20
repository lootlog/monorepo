import "dotenv/config";
import { z } from "zod";
import { RuntimeEnvironment } from "@lootlog/types";

const envSchema = z.object({
  ENV: z.nativeEnum(RuntimeEnvironment).default(RuntimeEnvironment.LOCAL),
  PORT: z.coerce.number().default(4000),
  SERVICE_NAME: z.string().default("battlelog-service"),
  POSTGRESQL_CONNECTION_URI: z.string(),
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
  COMMIT_SHA: z.string().optional(),
  HOSTNAME: z.string().optional(),
});

const parsedEnv = envSchema.parse(process.env);

export const APP_CONFIG = {
  env: parsedEnv.ENV,
  port: parsedEnv.PORT,
  serviceName: parsedEnv.SERVICE_NAME,
  postgresConnectionUri: parsedEnv.POSTGRESQL_CONNECTION_URI,
  redis: {
    host: parsedEnv.REDIS_HOST,
    port: parsedEnv.REDIS_PORT,
    password: parsedEnv.REDIS_PASSWORD,
    username: parsedEnv.REDIS_USERNAME,
  },
  r2: {
    accessKeyId: parsedEnv.R2_ACCESS_KEY_ID,
    secretAccessKey: parsedEnv.R2_SECRET_ACCESS_KEY,
    endpoint: parsedEnv.R2_ENDPOINT,
    region: parsedEnv.R2_REGION,
    bucketName: parsedEnv.R2_BUCKET_NAME,
  },
  observability: {
    otlpEndpoint: parsedEnv.OTEL_EXPORTER_OTLP_ENDPOINT,
    otlpHeaders: parsedEnv.OTEL_EXPORTER_OTLP_HEADERS,
    serviceNamespace: parsedEnv.SERVICE_NAMESPACE,
  },
  telemetry: {
    commitSha: parsedEnv.COMMIT_SHA,
    hostname: parsedEnv.HOSTNAME,
    axiomDataset: parsedEnv.AXIOM_DATASET,
    axiomToken: parsedEnv.AXIOM_TOKEN,
  },
} as const;

export type BattlelogAppConfig = typeof APP_CONFIG;
