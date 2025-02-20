import { RESTOptions } from '@discordjs/rest';
import { RuntimeEnvironment } from 'src/types/common.types';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: number;
      ENV: RuntimeEnvironment;

      DISCORD_API_VERSION: RESTOptions.version;
      DISCORD_API_AUTH_PREFIX: RESTOptions.authPrefix;

      AXIOM_DATASET: string;
      AXIOM_TOKEN: string;

      POSTGRESQL_CONNECTION_URI: string;

      RABBITMQ_URI: string;
    }
  }
}

export {};
