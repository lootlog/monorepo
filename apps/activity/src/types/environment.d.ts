import { RuntimeEnvironment } from "@lootlog/types";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string;
      ENV: RuntimeEnvironment;
      SERVICE_NAME: string;
      APP_VERSION: string;

      POSTGRESQL_CONNECTION_URI: string;

      RABBITMQ_URI: string;
      ACTIVITY_EVENT_SIGNATURE_SECRET: string;

      REDIS_PASSWORD: string;
      REDIS_HOST: string;
      REDIS_PORT: string;
      REDIS_USERNAME: string;

      API_SERVICE_URL: string;

      OTEL_EXPORTER_OTLP_ENDPOINT?: string;
      OTEL_EXPORTER_OTLP_HEADERS?: string;
      OTEL_NODE_RESOURCE_DETECTORS: string;
      OTEL_TRACES_EXPORTER: string;
      SERVICE_NAMESPACE: string;
    }
  }
}

export {};
