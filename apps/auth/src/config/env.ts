import "dotenv/config";
import { z } from "zod";
import { createEnv } from "@lootlog/nest-shared/config";
import { RuntimeEnvironment } from "@lootlog/types";

export const env = createEnv(
  z.object({
    ENV: z.nativeEnum(RuntimeEnvironment).default(RuntimeEnvironment.LOCAL),
    PORT: z.coerce.number(),
    SERVICE_NAME: z.string().default("auth"),

    TRUSTED_ORIGINS: z.string().transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
    COOKIE_DOMAIN: z.string(),
    COOKIE_PREFIX: z.string(),
    ADMIN_ACCOUNT_IDS: z.string().transform((value) =>
      value
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
    AUTH_SECRET: z.string(),

    APP_URL: z.string(),

    POSTGRESQL_PORT: z.coerce.number(),
    POSTGRESQL_HOST: z.string(),
    POSTGRESQL_USER: z.string(),
    POSTGRESQL_PASSWORD: z.string(),
    POSTGRESQL_DATABASE: z.string(),
    POSTGRESQL_SSL_CA: z.string().optional(),

    DISCORD_CLIENT_SECRET: z.string(),
    DISCORD_CLIENT_ID: z.string(),

    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
    OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
    OTEL_NODE_RESOURCE_DETECTORS: z.string().default("env,host,os,process"),
    OTEL_TRACES_EXPORTER: z.string().default("otlp"),
    SERVICE_NAMESPACE: z.string().default("local"),

    AXIOM_DATASET: z.string().optional(),
    AXIOM_TOKEN: z.string().optional(),
    COMMIT_SHA: z.string().optional(),
  }),
);
