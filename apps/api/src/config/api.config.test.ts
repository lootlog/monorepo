import { describe, expect, it } from "bun:test";
import { ConfigProvider, Effect } from "effect";
import { apiConfiguration } from "#src/config/api.config";

const requiredEnvironment = {
  PORT: "4000",
  RABBITMQ_URI: "amqp://rabbitmq.internal",
  REDIS_HOST: "redis.internal",
  AUTH_RPC_URL: "http://auth.internal:4100",
  DISCORD_BOT_RPC_URL: "http://discord-bot.internal:4100",
  RESERVATIONS_CARDS_URL: "https://cards.example.test/render",
  MAPS_API_URL: "https://maps.example.test/api",
};

const loadWith = (values: Record<string, string | undefined>) =>
  Effect.runPromise(
    apiConfiguration.parse(
      ConfigProvider.fromUnknown({ ...requiredEnvironment, ...values }),
    ),
  );

describe("apiConfiguration", () => {
  it("runs cleanup unless a deployment turns it off", async () => {
    const unset = await loadWith({});

    const disabled = await loadWith({
      TIMER_CLEANUP_ENABLED: "false",
      RESERVATIONS_CLEANUP_ENABLED: "off",
    });

    expect(unset.timerCleanup.enabled).toBe(true);
    expect(unset.reservationsCleanup.enabled).toBe(true);
    expect(disabled.timerCleanup.enabled).toBe(false);
    expect(disabled.reservationsCleanup.enabled).toBe(false);
  });

  it("refuses to start on an unrecognised flag value instead of turning cleanup off", async () => {
    await expect(
      loadWith({ TIMER_CLEANUP_ENABLED: "enabled" }),
    ).rejects.toBeDefined();
  });
});
