import "dotenv/config";
import { z } from "zod";
import { createEnv } from "@lootlog/nest-shared/config";
import { RuntimeEnvironment } from "src/types/common.types";

const booleanEnv = z
  .string()
  .optional()
  .transform((value) => {
    if (!value) {
      return false;
    }

    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  });

const parsedEnv = createEnv(
  z.object({
    ENV: z.nativeEnum(RuntimeEnvironment).default(RuntimeEnvironment.LOCAL),
    PORT: z.coerce.number(),
    API_URL: z.string().url(),
    AUTH_URL: z.string().url().optional(),
    MARGONEM_SIGNING_KEY_URL: z
      .string()
      .url()
      .default("https://staticinfo.margonem.pl/.well-known/signing-key.pem"),
    RABBITMQ_URI: z.string(),
    SERVICE_NAME: z.string().default("gateway"),
    REDIS_HOST: z.string(),
    REDIS_PORT: z.coerce.number(),
    REDIS_PASSWORD: z.string(),
    REDIS_USERNAME: z.string(),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
    OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
    OTEL_NODE_RESOURCE_DETECTORS: z.string().default("env,host,os,process"),
    OTEL_TRACES_EXPORTER: z.string().default("otlp"),
    SERVICE_NAMESPACE: z.string().default("local"),
    AXIOM_DATASET: z.string().optional(),
    AXIOM_TOKEN: z.string().optional(),
    DEV_PERMISSION_OVERRIDE_ENABLED: booleanEnv.default(false),
    ACTIVITY_EVENT_SIGNATURE_SECRET: z.string().min(32).optional(),
  }),
);

function requireInSharedEnvironments(
  value: string | undefined,
  key: "AUTH_URL" | "ACTIVITY_EVENT_SIGNATURE_SECRET",
  localFallback: string,
): string {
  if (
    value ||
    (parsedEnv.ENV !== RuntimeEnvironment.STAGING &&
      parsedEnv.ENV !== RuntimeEnvironment.PROD)
  ) {
    return value ?? localFallback;
  }

  throw new Error(`${key} is required when ENV=${parsedEnv.ENV}`);
}

export const env = {
  ...parsedEnv,
  AUTH_URL: requireInSharedEnvironments(
    parsedEnv.AUTH_URL,
    "AUTH_URL",
    "http://localhost/api/auth",
  ),
  ACTIVITY_EVENT_SIGNATURE_SECRET: requireInSharedEnvironments(
    parsedEnv.ACTIVITY_EVENT_SIGNATURE_SECRET,
    "ACTIVITY_EVENT_SIGNATURE_SECRET",
    "local-development-activity-event-signature-secret",
  ),
};
