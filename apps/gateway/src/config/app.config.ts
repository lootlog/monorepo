import { ConfigModuleOptions } from '@nestjs/config';
import * as Joi from 'joi';
import auth0Config from 'src/config/auth.config';
import rabbitmqConfig from 'src/config/rabbitmq.config';
import serviceConfig from 'src/config/service.config';
import { RuntimeEnvironment } from 'src/types/common.types';

export const APP_CONFIG: ConfigModuleOptions = {
  envFilePath: `.env`,
  isGlobal: true,
  load: [serviceConfig, auth0Config, rabbitmqConfig],
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
    RABBITMQ_URI: Joi.string().required(),
    AUTH_ISSUER: Joi.string().uri().required(),
    AUTH_AUDIENCE: Joi.string().uri().required(),
    JWKS_URL: Joi.string().uri().required(),
  }),
  validationOptions: {
    allowUnknown: true,
    abortEarly: true,
  },
};
