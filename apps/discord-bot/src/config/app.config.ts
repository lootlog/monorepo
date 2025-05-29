import { ConfigModuleOptions } from '@nestjs/config';

import serviceConfig from './service.config';
import discordConfig from './discord.config';
import { configSchema } from 'src/config/config.schema';
import rabbitmqConfig from 'src/config/rabbitmq.config';

export const APP_CONFIG: ConfigModuleOptions = {
  envFilePath: `.env`,
  isGlobal: true,
  load: [serviceConfig, discordConfig, rabbitmqConfig],
  cache: true,
  validationSchema: configSchema,
  validationOptions: {
    allowUnknown: true,
    abortEarly: true,
  },
};
