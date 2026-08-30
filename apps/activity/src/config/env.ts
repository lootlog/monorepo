import "dotenv/config";
import { z } from "zod";
import { RuntimeEnvironment } from "@lootlog/types";
import { createEnv } from "@lootlog/nest-shared/config";

const parsedEnv = createEnv(
  z.object({
    ENV: z.nativeEnum(RuntimeEnvironment).default(RuntimeEnvironment.LOCAL),
    PORT: z.coerce.number(),
    SERVICE_NAME: z.string().default("activity"),
    APP_VERSION: z.string(),
    POSTGRESQL_CONNECTION_URI: z.string().optional(),
    RABBITMQ_URI: z.string(),
    REDIS_HOST: z.string(),
    REDIS_PORT: z.coerce.number(),
    REDIS_PASSWORD: z.string(),
    REDIS_USERNAME: z.string(),
    API_SERVICE_URL: z.string().url(),
    ACTIVITY_EVENT_SIGNATURE_SECRET: z.string().min(32).optional(),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
    OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
    OTEL_NODE_RESOURCE_DETECTORS: z.string().default("env,host,os,process"),
    OTEL_TRACES_EXPORTER: z.string().default("otlp"),
    SERVICE_NAMESPACE: z.string().default("local"),
  }),
);

function requireActivitySignatureSecret(): string {
  if (
    parsedEnv.ACTIVITY_EVENT_SIGNATURE_SECRET ||
    (parsedEnv.ENV !== RuntimeEnvironment.STAGING &&
      parsedEnv.ENV !== RuntimeEnvironment.PROD)
  ) {
    return (
      parsedEnv.ACTIVITY_EVENT_SIGNATURE_SECRET ??
      "local-development-activity-event-signature-secret"
    );
  }

  throw new Error(
    `ACTIVITY_EVENT_SIGNATURE_SECRET is required when ENV=${parsedEnv.ENV}`,
  );
}

export const env = {
  ...parsedEnv,
  ACTIVITY_EVENT_SIGNATURE_SECRET: requireActivitySignatureSecret(),
};
