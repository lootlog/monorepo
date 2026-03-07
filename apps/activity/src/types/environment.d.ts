import { RuntimeEnvironment } from '@lootlog/types';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string;
      ENV: RuntimeEnvironment;
      SERVICE_NAME: string;
      APP_VERSION: string;

      AXIOM_DATASET: string;
      AXIOM_TOKEN: string;

      POSTGRESQL_CONNECTION_URI: string;

      RABBITMQ_URI: string;

      REDIS_PASSWORD: string;
      REDIS_HOST: string;
      REDIS_PORT: string;
      REDIS_USERNAME: string;

      AUTH_SERVICE_URL: string;
      AUTH_JWKS_URI: string;
      FORWARDED_AUTH_SIGNATURE_SECRET: string;
      API_SERVICE_URL: string;
    }
  }
}

export {};
