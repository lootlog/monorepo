import * as Joi from "joi";
import { RuntimeEnvironment } from "@lootlog/types";

export const configSchema = Joi.object({
  PORT: Joi.string().required(),
  ENV: Joi.string()
    .valid(
      RuntimeEnvironment.LOCAL,
      RuntimeEnvironment.DEV,
      RuntimeEnvironment.STAGING,
      RuntimeEnvironment.PROD,
    )
    .default(RuntimeEnvironment.LOCAL),
  DISCORD_BOT_TOKEN: Joi.string().required(),
  DISCORD_DEVELOPMENT_GUILD_ID: Joi.string().optional(),
  RABBITMQ_URI: Joi.string().required(),
  SERVICE_NAME: Joi.string().default("discord-bot"),
  OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().uri().allow(""),
  OTEL_EXPORTER_OTLP_HEADERS: Joi.string().allow(""),
  OTEL_NODE_RESOURCE_DETECTORS: Joi.string().default("env,host,os,process"),
  OTEL_TRACES_EXPORTER: Joi.string().default("otlp"),
  SERVICE_NAMESPACE: Joi.string().default("local"),
  AXIOM_DATASET: Joi.string(),
  AXIOM_TOKEN: Joi.string(),
});
