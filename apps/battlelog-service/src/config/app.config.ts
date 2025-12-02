import { ConfigModuleOptions } from '@nestjs/config';
import * as Joi from 'joi';
import r2Config from 'src/config/r2.config';
import redisConfig from 'src/config/redis.config';
import serviceConfig from 'src/config/service.config';
import winstonConfig from 'src/config/winston.config';
import { RuntimeEnvironment } from 'src/types/runtime.types';

export const APP_CONFIG: ConfigModuleOptions = {
  envFilePath: `.env`,
  isGlobal: true,
  load: [serviceConfig, winstonConfig, redisConfig, r2Config],
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
    SERVICE_NAME: Joi.string().default('battlelog-service'),
    POSTGRESQL_CONNECTION_URI: Joi.string(),
    AXIOM_DATASET: Joi.string(),
    AXIOM_TOKEN: Joi.string(),
    REDIS_HOST: Joi.string().required(),
    REDIS_PORT: Joi.number().required(),
    REDIS_PASSWORD: Joi.string().required(),
    REDIS_USERNAME: Joi.string().required(),
    R2_ACCESS_KEY_ID: Joi.string().required(),
    R2_SECRET_ACCESS_KEY: Joi.string().required(),
    R2_ENDPOINT: Joi.string().required(),
    R2_REGION: Joi.string().default('auto'),
    R2_BUCKET_NAME: Joi.string().required(),
    OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().uri().allow(''),
    OTEL_EXPORTER_OTLP_HEADERS: Joi.string().allow(''),
    OTEL_NODE_RESOURCE_DETECTORS: Joi.string().default('env,host,os,process'),
    OTEL_TRACES_EXPORTER: Joi.string().default('otlp'),
    SERVICE_NAMESPACE: Joi.string().default('local'),
  }),
  validationOptions: {
    allowUnknown: true,
    abortEarly: false,
  },
};
