import type { RuntimeEnvironment } from "src/types/common.types";

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
      AUTH_URL: string;
      MARGONEM_SIGNING_KEY_URL: string;
      ACTIVITY_EVENT_SIGNATURE_SECRET: string;

      OTEL_EXPORTER_OTLP_ENDPOINT: string;
      OTEL_EXPORTER_OTLP_HEADERS: string;
      OTEL_NODE_RESOURCE_DETECTORS: string;
      OTEL_TRACES_EXPORTER: string;
      SERVICE_NAMESPACE: string;
      DEV_PERMISSION_OVERRIDE_ENABLED: string;
    }
  }
}

export {};
