import { afterEach, vi } from "vitest";

vi.mock("@golevelup/nestjs-rabbitmq", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@golevelup/nestjs-rabbitmq")>();

  class AmqpConnection {
    publish = vi.fn().mockResolvedValue(undefined);
    request = vi.fn().mockResolvedValue(undefined);
  }

  class MockRabbitMQModule {}

  return {
    ...actual,
    AmqpConnection,
    RabbitMQModule: {
      forRoot: () => ({
        module: MockRabbitMQModule,
        providers: [
          {
            provide: AmqpConnection,
            useFactory: () => new AmqpConnection(),
          },
        ],
        exports: [AmqpConnection],
      }),
    },
    RabbitSubscribe: () => () => undefined,
  };
});

vi.mock("src/config/env", () => ({
  env: {
    ENV: "local",
    PORT: 4000,
    SERVICE_NAME: "activity",
    APP_VERSION: "test",
    POSTGRESQL_CONNECTION_URI:
      process.env.POSTGRESQL_CONNECTION_URI ??
      "postgresql://localhost:5432/activity",
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
