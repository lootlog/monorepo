import { afterEach, vi } from "vitest";

vi.mock("src/config/env", () => ({
  env: {
    PORT: 4000,
    ENV: "local",
    DISCORD_BOT_TOKEN: "test-discord-token",
    DISCORD_DEVELOPMENT_GUILD_ID: undefined,
    RABBITMQ_URI: "amqp://localhost:5672",
    SERVICE_NAME: "discord-bot",
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
