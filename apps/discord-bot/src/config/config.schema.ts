import * as Joi from 'joi';
import { RuntimeEnvironment } from 'src/types/common.types';

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
});
