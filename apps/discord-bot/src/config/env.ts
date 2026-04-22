import "dotenv/config";
import { z } from "zod";
import { createEnv } from "@lootlog/nest-shared/config";
import { RuntimeEnvironment } from "src/types/common.types";

export const env = createEnv(
  z.object({
    PORT: z.coerce.number(),
    ENV: z.nativeEnum(RuntimeEnvironment).default(RuntimeEnvironment.LOCAL),
    DISCORD_BOT_TOKEN: z.string(),
    DISCORD_DEVELOPMENT_GUILD_ID: z.string().optional(),
    RABBITMQ_URI: z.string(),
    SERVICE_NAME: z.string().default("discord-bot"),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
    OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
    OTEL_NODE_RESOURCE_DETECTORS: z.string().default("env,host,os,process"),
    OTEL_TRACES_EXPORTER: z.string().default("otlp"),
    SERVICE_NAMESPACE: z.string().default("local"),
    AXIOM_DATASET: z.string().optional(),
    AXIOM_TOKEN: z.string().optional(),
  }),
);
