import { ConfigModuleOptions } from '@nestjs/config';
import * as Joi from 'joi';
import auth0Config from 'src/config/auth0.config';
import discordConfig from 'src/config/discord.config';
import meilisearchConfig from 'src/config/meilisearch.config';
import rabbitmqConfig from 'src/config/rabbitmq.config';
import serviceConfig from 'src/config/service.config';
import winstonConfig from 'src/config/winston.config';
import { RuntimeEnvironment } from 'src/types/common.types';

export const APP_CONFIG: ConfigModuleOptions = {
  envFilePath: `.env`,
  isGlobal: true,
  load: [
    serviceConfig,
    auth0Config,
    discordConfig,
    rabbitmqConfig,
    winstonConfig,
    meilisearchConfig,
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
    AUTH0_CLIENT_ID: Joi.string().required(),
    AUTH0_CLIENT_SECRET: Joi.string().required(),
    AUTH0_DOMAIN: Joi.string().required(),
    AUTH0_AUDIENCE: Joi.string().required(),
    AUTH0_ISSUER_URL: Joi.string().required(),
    DISCORD_API_VERSION: Joi.string().required(),
    DISCORD_API_AUTH_PREFIX: Joi.string().required(),
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
