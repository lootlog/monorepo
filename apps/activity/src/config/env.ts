import "dotenv/config";
import { RuntimeEnvironment } from "@lootlog/types";
import { z } from "zod";

const envSchema = z.object({
  ENV: z.nativeEnum(RuntimeEnvironment).default(RuntimeEnvironment.LOCAL),
  PORT: z.coerce.number().default(4000),
  SERVICE_NAME: z.string().default("activity"),
  APP_VERSION: z.string().default("0.0.1"),
  POSTGRESQL_CONNECTION_URI: z
    .string()
    .default("postgresql://placeholder:placeholder@localhost:5432/placeholder"),
  RABBITMQ_URI: z.string().default("amqp://guest:guest@localhost:5672"),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().default(""),
  REDIS_USERNAME: z.string().default(""),
  API_SERVICE_URL: z.string().url().default("http://localhost:3000"),
  AXIOM_DATASET: z.string().optional(),
  AXIOM_TOKEN: z.string().optional(),
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
  appVersion: parsedEnv.APP_VERSION,
  postgresConnectionUri: parsedEnv.POSTGRESQL_CONNECTION_URI,
  rabbitmqUri: parsedEnv.RABBITMQ_URI,
  apiServiceUrl: parsedEnv.API_SERVICE_URL,
  redis: {
    host: parsedEnv.REDIS_HOST,
    port: parsedEnv.REDIS_PORT,
    password: parsedEnv.REDIS_PASSWORD,
    username: parsedEnv.REDIS_USERNAME,
  },
  telemetry: {
    axiomDataset: parsedEnv.AXIOM_DATASET,
    axiomToken: parsedEnv.AXIOM_TOKEN,
    commitSha: parsedEnv.COMMIT_SHA,
    hostname: parsedEnv.HOSTNAME,
  },
  observability: {
    otlpEndpoint: parsedEnv.OTEL_EXPORTER_OTLP_ENDPOINT,
    otlpHeaders: parsedEnv.OTEL_EXPORTER_OTLP_HEADERS,
    serviceNamespace: parsedEnv.SERVICE_NAMESPACE,
  },
} as const;

export type ActivityAppConfig = typeof APP_CONFIG;
