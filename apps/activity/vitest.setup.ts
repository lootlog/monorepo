import { afterEach, vi } from "vitest";

vi.mock("src/config/env", () => ({
  env: {
    ENV: "local",
    PORT: 4000,
    SERVICE_NAME: "activity",
    APP_VERSION: "test",
    POSTGRESQL_CONNECTION_URI: "postgresql://localhost:5432/activity",
    RABBITMQ_URI: "amqp://localhost:5672",
    AXIOM_DATASET: "",
    AXIOM_TOKEN: "",
    REDIS_HOST: "localhost",
    REDIS_PORT: 6379,
    REDIS_PASSWORD: "",
    REDIS_USERNAME: "default",
    API_SERVICE_URL: "http://localhost:3000",
    ACTIVITY_EVENT_SIGNATURE_SECRET:
      "local-development-activity-event-signature-secret",
  },
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
