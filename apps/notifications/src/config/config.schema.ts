import * as Joi from "joi";
import { RuntimeEnvironment } from "src/types/runtime.types";

export const configSchema = Joi.object({
  PORT: Joi.number().default(4028),
  ENV: Joi.string()
    .valid(
      RuntimeEnvironment.LOCAL,
      RuntimeEnvironment.DEV,
      RuntimeEnvironment.STAGING,
      RuntimeEnvironment.PROD,
    )
    .default(RuntimeEnvironment.LOCAL),
  RABBITMQ_URI: Joi.string().required(),
  NOTIFICATIONS_POSTGRESQL_CONNECTION_URI: Joi.string().optional(),
  POSTGRESQL_CONNECTION_URI: Joi.string().optional(),
  API_SERVICE_URL: Joi.string().uri().required(),
  DISCORD_BOT_SERVICE_URL: Joi.string().uri().required(),
  SERVICE_NAME: Joi.string().default("notifications"),
  OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().uri().allow(""),
  OTEL_EXPORTER_OTLP_HEADERS: Joi.string().allow(""),
  OTEL_NODE_RESOURCE_DETECTORS: Joi.string().default("env,host,os,process"),
  OTEL_TRACES_EXPORTER: Joi.string().default("otlp"),
  SERVICE_NAMESPACE: Joi.string().default("local"),
});
