import { afterEach, vi } from "vitest";

vi.mock("#src/config/env", () => ({
  env: {
    PORT: 4000,
    ENV: "local",
    SERVICE_NAME: "search",
    MEILISEARCH_HOST: "http://localhost:7700",
    MEILISEARCH_API_KEY: "test-api-key",
    RABBITMQ_URI: "amqp://localhost:5672",
    OTEL_EXPORTER_OTLP_ENDPOINT: undefined,
    OTEL_EXPORTER_OTLP_HEADERS: undefined,
    OTEL_NODE_RESOURCE_DETECTORS: "env,host,os,process",
    OTEL_TRACES_EXPORTER: "otlp",
    SERVICE_NAMESPACE: "local",
    COMMIT_SHA: undefined,
  },
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
