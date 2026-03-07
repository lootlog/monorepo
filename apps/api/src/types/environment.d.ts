import type { RESTOptions } from '@discordjs/rest';
import type { RuntimeEnvironment } from 'src/types/runtime.types';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: number;
      ENV: RuntimeEnvironment;
      SERVICE_NAME: string;

      DISCORD_API_VERSION: RESTOptions.version;
      DISCORD_API_AUTH_PREFIX: RESTOptions.authPrefix;

      AXIOM_DATASET: string;
      AXIOM_TOKEN: string;

      POSTGRESQL_CONNECTION_URI: string;

      RABBITMQ_URI: string;

      AUTH_SERVICE_URL: string;
      AUTH_INTERNAL_URL: string;
      AUTH_JWKS_URI: string;
      INTERNAL_SERVICE_AUTH_SECRET: string;
      FORWARDED_AUTH_SIGNATURE_SECRET: string;

      REDIS_PASSWORD: string;
      REDIS_HOST: string;
      REDIS_PORT: string;
      REDIS_USERNAME: string;

      RESERVATIONS_CARDS_URL?: string;
      MAPS_API_URL?: string;

      OTEL_EXPORTER_OTLP_ENDPOINT: string;
      OTEL_EXPORTER_OTLP_HEADERS: string;
      OTEL_NODE_RESOURCE_DETECTORS: string;
      OTEL_TRACES_EXPORTER: string;
      SERVICE_NAMESPACE: string;
    }
  }
}

export {};
