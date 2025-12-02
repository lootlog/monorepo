import { ConfigModuleOptions } from '@nestjs/config';
import * as Joi from 'joi';
import apiConfig from 'src/config/api.config';
import rabbitmqConfig from 'src/config/rabbitmq.config';
import redisConfig from 'src/config/redis.config';
import serviceConfig from 'src/config/service.config';
import { RuntimeEnvironment } from 'src/types/common.types';

export const APP_CONFIG: ConfigModuleOptions = {
  envFilePath: `.env`,
  isGlobal: true,
  load: [serviceConfig, rabbitmqConfig, redisConfig, apiConfig],
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
    API_URL: Joi.string().uri().required(),
    RABBITMQ_URI: Joi.string().required(),
    SERVICE_NAME: Joi.string().default('gateway'),
    REDIS_HOST: Joi.string().required(),
    REDIS_PORT: Joi.number().required(),
    REDIS_PASSWORD: Joi.string().required(),
    REDIS_USERNAME: Joi.string().required(),
    OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().uri(),
    OTEL_EXPORTER_OTLP_HEADERS: Joi.string(),
    OTEL_NODE_RESOURCE_DETECTORS: Joi.string().default('env,host,os,process'),
    OTEL_TRACES_EXPORTER: Joi.string().default('otlp'),
    SERVICE_NAMESPACE: Joi.string().default('local'),
  }),
  validationOptions: {
    allowUnknown: true,
    abortEarly: true,
  },
};
