import { RuntimeEnvironment } from '@lootlog/types';
import type { ConfigModuleOptions } from '@nestjs/config';
import * as Joi from 'joi';
import apiServiceConfig from 'src/config/api-service.config';
import rabbitmqConfig from 'src/config/rabbitmq.config';
import redisConfig from 'src/config/redis.config';
import serviceConfig from 'src/config/service.config';
import swaggerConfig from 'src/config/swagger.config';
import winstonConfig from 'src/config/winston.config';

export const APP_CONFIG: ConfigModuleOptions = {
  envFilePath: `.env`,
  isGlobal: true,
  load: [
    serviceConfig,
    rabbitmqConfig,
    winstonConfig,
    redisConfig,
    swaggerConfig,
    apiServiceConfig,
  ],
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
    SERVICE_NAME: Joi.string().required(),
    APP_VERSION: Joi.string().required(),
    POSTGRESQL_CONNECTION_URI: Joi.string(),
    RABBITMQ_URI: Joi.string(),
    AXIOM_DATASET: Joi.string(),
    AXIOM_TOKEN: Joi.string(),
    REDIS_HOST: Joi.string().required(),
    REDIS_PORT: Joi.number().required(),
    REDIS_PASSWORD: Joi.string().allow('').required(),
    REDIS_USERNAME: Joi.string().allow('').required(),
    AUTH_SERVICE_URL: Joi.string().uri().required(),
    AUTH_JWKS_URI: Joi.string().uri().required(),
    FORWARDED_AUTH_SIGNATURE_SECRET: Joi.string().required(),
    API_SERVICE_URL: Joi.string().uri().required(),
  }),
  validationOptions: {
    allowUnknown: true,
    abortEarly: false,
  },
};
