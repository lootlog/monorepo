import { describe, expect, test } from "bun:test";
import type { GameCharacterOffline } from "@lootlog/protocol/rabbit/events";
import { Effect, Fiber } from "effect";
import { TestClock } from "effect/testing";
import { PresenceStore } from "./presence-store.js";
import type { SessionData } from "#src/realtime/session";
import {
  MemoryRedis,
  RecordingHub,
  character,
  session,
  socket,
  publish,
  disconnect,
} from "../../test/presence-store-fixtures.js";

const gameSocket = (overrides: Partial<SessionData> = {}) =>
  socket({ ...session([]), character, ...overrides });

const offlineStore = (
  redis: MemoryRedis,
  now: () => number,
  events: GameCharacterOffline[] = [],
  afterPublish?: () => void,
) => {
  const store = new PresenceStore(
    { command: redis },
    new RecordingHub(),
    now,
    undefined,
    undefined,
    (event) =>
      Effect.sync(() => {
        events.push(event);
        afterPublish?.();
      }),
  );

  return { store, events };
};

const sweepOffline = (store: PresenceStore) =>
  Effect.runPromise(store.sweepOffline);

describe("game character offline grace", () => {
  test("publishes only after ten seconds, survives a new store instance and ignores web presence", async () => {
    const redis = new MemoryRedis();
    let now = 0;
    const events: GameCharacterOffline[] = [];

    const sweep = () =>
      sweepOffline(offlineStore(redis, () => now, events).store);

    const { store } = offlineStore(redis, () => now, events);
    const game = gameSocket();
    await publish(store, game);
    await disconnect(store, game);
    await publish(
      store,
      gameSocket({ connectionId: "web", platform: "web-app" }),
    );
    now = 9_999;
    await sweep();
    expect(events).toEqual([]);
    now = 10_000;
    await sweep();
    expect(events).toEqual([
      {
        userId: "user-1",
        discordId: "discord-1",
        world: "world-1",
        characterId: "character-1",
        organizationIds: ["organization-1"],
        disconnectedAt: 0,
      },
    ]);
    await sweep();
    expect(events).toHaveLength(1);
  });

  test("drains a disconnect burst when grace expires even after earlier sweeps saw only young entries", async () => {
    let now = 0;
    const { store, events } = offlineStore(new MemoryRedis(), () => now);

    for (let index = 0; index < 350; index++) {
      const game = gameSocket({
        userId: `user-${index}`,
        connectionId: `session-${index}`,
      });

      await publish(store, game);
      await disconnect(store, game);
    }

    now = 9_999;
    await sweepOffline(store);
    expect(events).toEqual([]);
    now = 10_000;
    await sweepOffline(store);
    expect(events).toHaveLength(350);
    expect(new Set(events.map(({ userId }) => userId)).size).toBe(350);
  });

  test("interrupts lease acquisition while Redis is unavailable", async () => {
    const started = Promise.withResolvers<void>();
    const stalled = Promise.withResolvers<string | null>();

    class StalledRedis extends MemoryRedis {
      override set(
        key: string,
        value: string,
        ...options: Array<string | number>
      ) {
        if (key === "presence:offline:sweep-lock") {
          started.resolve();

          return stalled.promise;
        }

        return super.set(key, value, ...options);
      }
    }

    const { store } = offlineStore(new StalledRedis(), () => 0);
    const fiber = Effect.runFork(store.sweepOffline);
    await started.promise;

    try {
      const interrupted = await Promise.race([
        Effect.runPromise(Fiber.interrupt(fiber)).then(() => true),
        Bun.sleep(100).then(() => false),
      ]);

      expect(interrupted).toBe(true);
    } finally {
      stalled.resolve(null);
      await Effect.runPromise(Fiber.interrupt(fiber));
    }
  });

  test("bounds lease release during shutdown when Redis stops responding", async () => {
    const started = Promise.withResolvers<void>();
    const stalled = Promise.withResolvers<void>();

    class StalledRedis extends MemoryRedis {
      override async eval<A>(
        script: string,
        numberOfKeys: number,
        ...parameters: Array<string | number>
      ): Promise<A> {
        if (script.includes("-- presence:lease-release")) {
          started.resolve();
          await stalled.promise;
        }

        return super.eval<A>(script, numberOfKeys, ...parameters);
      }
    }

    const { store } = offlineStore(new StalledRedis(), () => 0);

    try {
      await Effect.runPromise(
        Effect.gen(function* () {
          const fiber = yield* store.sweepOffline.pipe(Effect.forkScoped);
          yield* Effect.promise(() => started.promise);
          yield* TestClock.adjust("1 second");
          expect(fiber.pollUnsafe()?._tag).toBe("Success");
        }).pipe(Effect.scoped, Effect.provide(TestClock.layer())),
      );
    } finally {
      stalled.resolve();
    }
  });

  test("changing game character expires the old character while the new one stays online", async () => {
    let now = 0;
    const { store, events } = offlineStore(new MemoryRedis(), () => now);
    const game = gameSocket();
    await publish(store, game);
    game.data.character = { ...character, characterId: "other-character" };
    await publish(store, game);
    now = 10_000;
    await sweepOffline(store);
    expect(events.map((event) => event.characterId)).toEqual(["character-1"]);
  });
});
