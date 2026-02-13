import type { ConfigModuleOptions } from "@nestjs/config";
import { configSchema } from "src/config/config.schema";
import apiServiceConfig from "src/config/api-service.config";
import discordBotServiceConfig from "src/config/discord-bot-service.config";
import rabbitmqConfig from "src/config/rabbitmq.config";
import serviceConfig from "src/config/service.config";

export const APP_CONFIG: ConfigModuleOptions = {
  envFilePath: `.env`,
  isGlobal: true,
  load: [
    serviceConfig,
    rabbitmqConfig,
    apiServiceConfig,
    discordBotServiceConfig,
  ],
  cache: true,
  validationSchema: configSchema,
  validationOptions: {
    allowUnknown: true,
    abortEarly: true,
  },
};
