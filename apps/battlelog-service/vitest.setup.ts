import { afterEach, vi } from "vitest";

vi.mock("#src/config/env", () => ({
  env: {
    ENV: "local",
    PORT: 4000,
    SERVICE_NAME: "battlelog-service",
    POSTGRESQL_CONNECTION_URI: "postgresql://localhost:5432/battlelog",
    REDIS_HOST: "localhost",
    REDIS_PORT: 6379,
    REDIS_PASSWORD: "",
    REDIS_USERNAME: "default",
    R2_ACCESS_KEY_ID: "test-access-key",
    R2_SECRET_ACCESS_KEY: "test-secret-key",
    R2_ENDPOINT: "https://example.invalid",
    R2_REGION: "auto",
    R2_BUCKET_NAME: "battlelog-test",
    OTEL_EXPORTER_OTLP_ENDPOINT: undefined,
    OTEL_EXPORTER_OTLP_HEADERS: undefined,
    OTEL_NODE_RESOURCE_DETECTORS: "env,host,os,process",
    OTEL_TRACES_EXPORTER: "otlp",
    SERVICE_NAMESPACE: "local",
  },
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
