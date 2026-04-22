import { afterEach, vi } from "vitest";

vi.mock("src/config/env", () => ({
  env: {
    ENV: "local",
    PORT: 4000,
    API_URL: "http://localhost:3000",
    RABBITMQ_URI: "amqp://localhost:5672",
    SERVICE_NAME: "gateway",
    REDIS_HOST: "localhost",
    REDIS_PORT: 6379,
    REDIS_PASSWORD: "",
    REDIS_USERNAME: "default",
    OTEL_EXPORTER_OTLP_ENDPOINT: undefined,
    OTEL_EXPORTER_OTLP_HEADERS: undefined,
    OTEL_NODE_RESOURCE_DETECTORS: "env,host,os,process",
    OTEL_TRACES_EXPORTER: "otlp",
    SERVICE_NAMESPACE: "local",
    AXIOM_DATASET: "",
    AXIOM_TOKEN: "",
  },
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
