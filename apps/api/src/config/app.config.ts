import { RuntimeEnvironment } from '@lootlog/types';
import { ConfigModuleOptions } from '@nestjs/config';
import * as Joi from 'joi';
import rabbitmqConfig from 'src/config/rabbitmq.config';
import serviceConfig from 'src/config/service.config';
import winstonConfig from 'src/config/winston.config';

export const APP_CONFIG: ConfigModuleOptions = {
  envFilePath: `.env`,
  isGlobal: true,
  load: [serviceConfig, rabbitmqConfig, winstonConfig],
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
    POSTGRESQL_CONNECTION_URI: Joi.string(),
    RABBITMQ_URI: Joi.string(),
    AXIOM_DATASET: Joi.string(),
    AXIOM_TOKEN: Joi.string(),
  }),
  validationOptions: {
    allowUnknown: true,
    abortEarly: false,
  },
};
