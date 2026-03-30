import type { ConfigModuleOptions } from "@nestjs/config";
import * as Joi from "joi";
import { redisConfig } from "@lootlog/nest-shared";
import { RuntimeEnvironment } from "@lootlog/types";
import serviceConfig from "src/config/service.config";
import winstonConfig from "src/config/winston.config";
import rabbitmqConfig from "src/config/rabbitmq.config";

export const APP_CONFIG: ConfigModuleOptions = {
  envFilePath: `.env`,
  isGlobal: true,
  load: [serviceConfig, winstonConfig, redisConfig, rabbitmqConfig],
  cache: true,
  validationSchema: Joi.object({
    ENV: Joi.string()
      .valid(
        RuntimeEnvironment.LOCAL,
        RuntimeEnvironment.DEV,
        RuntimeEnvironment.STAGING,
        RuntimeEnvironment.PROD,
      )
      .default(RuntimeEnvironment.LOCAL),
    PORT: Joi.number().default(4010),
    SERVICE_NAME: Joi.string().default("notifications-worker"),
    POSTGRESQL_CONNECTION_URI: Joi.string().required(),
    RABBITMQ_URI: Joi.string().required(),
    REDIS_HOST: Joi.string().required(),
    REDIS_PORT: Joi.number().required(),
    REDIS_PASSWORD: Joi.string().required(),
    REDIS_USERNAME: Joi.string().required(),
    AXIOM_DATASET: Joi.string(),
    AXIOM_TOKEN: Joi.string(),
    OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().uri().allow(""),
    OTEL_EXPORTER_OTLP_HEADERS: Joi.string().allow(""),
    OTEL_NODE_RESOURCE_DETECTORS: Joi.string().default("env,host,os,process"),
    OTEL_TRACES_EXPORTER: Joi.string().default("otlp"),
    SERVICE_NAMESPACE: Joi.string().default("local"),
  }),
  validationOptions: {
    allowUnknown: true,
    abortEarly: false,
  },
};
