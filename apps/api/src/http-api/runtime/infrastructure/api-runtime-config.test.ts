import { describe, expect, it } from "bun:test";
import { ConfigProvider, Effect, Exit, Redacted } from "effect";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { apiRuntimeConfiguration } from "#src/http-api/runtime/infrastructure/api-runtime-config";

const requiredEnvironment = {
  PORT: "4000",
  RABBITMQ_URI: "amqp://rabbitmq.internal",
  REDIS_HOST: "redis.internal",
  REDIS_PORT: "6379",
  REDIS_USERNAME: "api",
  REDIS_PASSWORD: "redis-secret",
  AUTH_SERVICE_URL: "http://auth.internal:4000",
  RESERVATIONS_CARDS_URL: "https://cards.example.test/render",
  MAPS_API_URL: "https://maps.example.test/api",
};

const loadWith = (values: Record<string, unknown>) =>
  apiRuntimeConfiguration.parse(ConfigProvider.fromUnknown(values));

describe("apiRuntimeConfiguration", () => {
  it("loads the existing env names and preserves legacy defaults", async () => {
    const config = await Effect.runPromise(loadWith(requiredEnvironment));

    expect(config.environment).toBe(RuntimeEnvironment.LOCAL);
    expect(config.serviceName).toBe("api");
    expect(config.serviceNamespace).toBe("local");
    expect(config.battlelogServiceUrl.href).toBe(
      "http://battlelog-service:4000/",
    );
    expect(config.discordBotServiceUrl.href).toBe("http://discord-bot:4000/");
    expect(config.timerCleanup).toEqual({ enabled: "true", retentionDays: 7 });
    expect(config.reservationsCleanup).toEqual({
      enabled: "true",
      retentionDays: 30,
    });
    expect(config.nodeWarningDiagnosticsEnabled).toBe(false);
    expect(config.postgresqlConnectionUri).toBeUndefined();
  });

  it("keeps secret-bearing inputs redacted", async () => {
    const config = await Effect.runPromise(
      loadWith({
        ...requiredEnvironment,
        POSTGRESQL_CONNECTION_URI: "postgres://database-secret",
        OTEL_EXPORTER_OTLP_HEADERS: "authorization=telemetry-secret",
      }),
    );

    expect(String(config.rabbitmqUri)).not.toContain("rabbitmq.internal");
    expect(String(config.redis.password)).not.toContain("redis-secret");
    expect(String(config.postgresqlConnectionUri)).not.toContain(
      "database-secret",
    );
    expect(String(config.telemetry.headers)).not.toContain("telemetry-secret");
    expect(Redacted.value(config.redis.password)).toBe("redis-secret");
  });

  it("matches the legacy permissive boolean spellings", async () => {
    const config = await Effect.runPromise(
      loadWith({
        ...requiredEnvironment,
        NODE_WARNING_DIAGNOSTICS_ENABLED: "unexpected-value",
      }),
    );

    expect(config.nodeWarningDiagnosticsEnabled).toBe(false);
  });

  it("fails closed for missing required input", () => {
    const missingRabbit = Effect.runSyncExit(
      loadWith({ ...requiredEnvironment, RABBITMQ_URI: undefined }),
    );
    expect(Exit.isFailure(missingRabbit)).toBe(true);
  });
});
