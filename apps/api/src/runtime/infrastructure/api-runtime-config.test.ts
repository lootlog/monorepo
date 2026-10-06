import { describe, expect, it } from "bun:test";
import { ConfigProvider, Effect, Exit, Redacted } from "effect";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { apiConfiguration } from "#src/config/api.config";

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

const loadWith = (values: Record<string, string | undefined>) =>
  apiConfiguration.parse(ConfigProvider.fromUnknown(values));

describe("apiConfiguration", () => {
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
  });

  it("keeps secret-bearing inputs redacted", async () => {
    const config = await Effect.runPromise(loadWith(requiredEnvironment));

    expect(String(config.rabbitmqUri)).not.toContain("rabbitmq.internal");
    expect(String(config.redis.password)).not.toContain("redis-secret");
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

  it("reads global chat admins as a comma-separated User id list", async () => {
    const config = await Effect.runPromise(
      loadWith({
        ...requiredEnvironment,
        GLOBAL_CHAT_ADMIN_USER_IDS: " user-1, ,user-2,",
      }),
    );

    const unset = await Effect.runPromise(loadWith(requiredEnvironment));

    expect(config.globalChatAdminUserIds).toEqual(["user-1", "user-2"]);
    expect(unset.globalChatAdminUserIds).toEqual([]);
  });

  it("fails closed for missing required input", () => {
    const missingRabbit = Effect.runSyncExit(
      loadWith({ ...requiredEnvironment, RABBITMQ_URI: undefined }),
    );

    expect(Exit.isFailure(missingRabbit)).toBe(true);
  });
});
