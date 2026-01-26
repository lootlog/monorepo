import type { ConfigModuleOptions } from '@nestjs/config';
import * as Joi from 'joi';
import authConfig from 'src/config/auth.config';
import rabbitmqConfig from 'src/config/rabbitmq.config';
import redisConfig from 'src/config/redis.config';
import serviceConfig from 'src/config/service.config';
import winstonConfig from 'src/config/winston.config';
import { RuntimeEnvironment } from 'src/types/runtime.types';

export const APP_CONFIG: ConfigModuleOptions = {
  envFilePath: `.env`,
  isGlobal: true,
  load: [serviceConfig, rabbitmqConfig, winstonConfig, redisConfig, authConfig],
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
    PORT: Joi.number().required(),
    SERVICE_NAME: Joi.string().default('api'),
    POSTGRESQL_CONNECTION_URI: Joi.string(),
    RABBITMQ_URI: Joi.string(),
    AXIOM_DATASET: Joi.string(),
    AXIOM_TOKEN: Joi.string(),
    REDIS_HOST: Joi.string().required(),
    REDIS_PORT: Joi.number().required(),
    REDIS_PASSWORD: Joi.string().allow('').required(),
    REDIS_USERNAME: Joi.string().allow('').required(),
    AUTH_SERVICE_URL: Joi.string().required(),
    RESERVATIONS_CARDS_URL: Joi.string().uri().required(),
    OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().uri().allow(''),
    OTEL_EXPORTER_OTLP_HEADERS: Joi.string().allow(''),
    OTEL_NODE_RESOURCE_DETECTORS: Joi.string().default('env,host,os,process'),
    OTEL_TRACES_EXPORTER: Joi.string().default('otlp'),
    SERVICE_NAMESPACE: Joi.string().default('local'),
    MAPS_API_URL: Joi.string().uri().required(),
  }),
  validationOptions: {
    allowUnknown: true,
    abortEarly: false,
  },
};
