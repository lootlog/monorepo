import { describe, expect, mock, test } from "bun:test";
import { Effect, Fiber } from "effect";
import { discordSdkRead } from "./discord-sdk-read.js";

describe("Discord SDK read adapter", () => {
  test("retries a failed idempotent SDK read within the bound", async () => {
    let attempt = 0;
    const execute = mock(async () => {
      attempt += 1;
      if (attempt < 3) throw new Error("temporary Discord failure");
      return "ready";
    });

    await expect(
      Effect.runPromise(discordSdkRead("fetchGuild", execute)),
    ).resolves.toBe("ready");
    expect(execute).toHaveBeenCalledTimes(3);
  });

  test("propagates interruption without starting another attempt", async () => {
    const execute = mock(() => new Promise<never>(() => undefined));
    const fiber = Effect.runFork(discordSdkRead("fetchGuild", execute));
    while (execute.mock.calls.length === 0) await Promise.resolve();

    await Effect.runPromise(Fiber.interrupt(fiber));

    expect(execute).toHaveBeenCalledTimes(1);
  });
});
