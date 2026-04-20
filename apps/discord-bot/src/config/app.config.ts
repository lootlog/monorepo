import { RuntimeEnvironment } from "@lootlog/types";
import "dotenv/config";
import { z } from "zod";

const configSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  ENV: z.nativeEnum(RuntimeEnvironment).default(RuntimeEnvironment.LOCAL),
  SERVICE_NAME: z.string().default("discord-bot"),
  DISCORD_BOT_TOKEN: z.string().min(1),
  DISCORD_DEVELOPMENT_GUILD_ID: z.string().min(1).optional(),
  RABBITMQ_URI: z.string().min(1),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
  SERVICE_NAMESPACE: z.string().default("local"),
  AXIOM_DATASET: z.string().optional(),
  AXIOM_TOKEN: z.string().optional(),
  COMMIT_SHA: z.string().optional(),
});

const parsedEnvironment = configSchema.parse(process.env);

export const APP_CONFIG = {
  port: parsedEnvironment.PORT,
  env: parsedEnvironment.ENV,
  serviceName: parsedEnvironment.SERVICE_NAME,
  discord: {
    botToken: parsedEnvironment.DISCORD_BOT_TOKEN,
    developmentGuildId: parsedEnvironment.DISCORD_DEVELOPMENT_GUILD_ID,
  },
  rabbitmq: {
    uri: parsedEnvironment.RABBITMQ_URI,
    exchange: "default",
  },
  observability: {
    otlpEndpoint: parsedEnvironment.OTEL_EXPORTER_OTLP_ENDPOINT,
    otlpHeaders: parsedEnvironment.OTEL_EXPORTER_OTLP_HEADERS,
    serviceNamespace: parsedEnvironment.SERVICE_NAMESPACE,
  },
  axiom: {
    dataset: parsedEnvironment.AXIOM_DATASET,
    token: parsedEnvironment.AXIOM_TOKEN,
  },
  commitSha: parsedEnvironment.COMMIT_SHA,
} as const;
