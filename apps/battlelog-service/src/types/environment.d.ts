import type { RuntimeEnvironment } from 'src/types/runtime.types';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: number;
      ENV: RuntimeEnvironment;
      SERVICE_NAME: string;

      AXIOM_DATASET: string;
      AXIOM_TOKEN: string;

      POSTGRESQL_CONNECTION_URI: string;

      AUTH_SERVICE_URL: string;
      AUTH_JWKS_URI: string;
      FORWARDED_AUTH_SIGNATURE_SECRET: string;
      R2_ACCESS_KEY_ID: string;
      R2_SECRET_ACCESS_KEY: string;
      R2_ENDPOINT: string;
      R2_REGION: string;
      R2_BUCKET_NAME: string;

      REDIS_PASSWORD: string;
      REDIS_HOST: string;
      REDIS_PORT: string;
      REDIS_USERNAME: string;

      OTEL_EXPORTER_OTLP_ENDPOINT: string;
      OTEL_EXPORTER_OTLP_HEADERS: string;
      OTEL_NODE_RESOURCE_DETECTORS: string;
      OTEL_TRACES_EXPORTER: string;
      SERVICE_NAMESPACE: string;
    }
  }
}

export {};
