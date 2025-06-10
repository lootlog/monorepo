import { RuntimeEnvironment } from 'src/types/common.types';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ENV: RuntimeEnvironment;
      PORT: string;
      SERVICE_NAME: string;

      REDIS_PASSWORD: string;
      REDIS_HOST: string;
      REDIS_PORT: string;
      REDIS_USERNAME: string;

      RABBITMQ_URI: string;
    }
  }
}

export {};
