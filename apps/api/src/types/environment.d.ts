import { RESTOptions } from '@discordjs/rest';
import { RuntimeEnvironment } from 'src/types/common.types';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: number;
      ENV: RuntimeEnvironment;

      AUTH0_CLIENT_SECRET: string;
      AUTH0_CLIENT_ID: string;
      AUTH0_DOMAIN: string;
      AUTH0_AUDIENCE: string;
      AUTH0_ISSUER_URL: string;

      DISCORD_API_VERSION: RESTOptions.version;
      DISCORD_API_AUTH_PREFIX: RESTOptions.authPrefix;

      AXIOM_DATASET: string;
      AXIOM_TOKEN: string;

      POSTGRESQL_CONNECTION_URI: string;

      RABBITMQ_URI: string;

      MEILISEARCH_HOST: string;
      MEILISEARCH_MASTER_KEY: string;
    }
  }
}

export {};
