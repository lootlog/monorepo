import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import {
  COMMIT_READY_ROOM_SCRIPT,
  CREATE_READY_ROOM_SCRIPT,
} from "#src/messaging/ready-room/ready-room-redis-scripts";
import type { ReadyRoomAggregate } from "#src/messaging/ready-room/ready-room.types";
import {
  makeReadyRoomRepository,
  type ReadyRoomRedis,
} from "./ready-room.repository.js";

const clock = () => Date.parse("2026-09-02T10:00:00.000Z");

const aggregate = (overrides: Partial<ReadyRoomAggregate> = {}) =>
  ({
    schemaVersion: 3,
    notificationId: "notification-1",
    organizerDiscordId: "discord-1",
    organizerCharacter: {
      accountId: "account-1",
      characterId: "character-1",
      nick: "Organizer",
      lvl: 100,
      prof: "w",
      icon: "icon",
    },
    guildIds: ["guild-1"],
    world: "Tempest",
    status: "ACTIVE",
    revision: 1,
    createdAt: "2026-09-02T10:00:00.000Z",
    updatedAt: "2026-09-02T10:00:00.000Z",
    expiresAt: "2026-09-02T10:30:00.000Z",
    participants: {},
    ...overrides,
  }) satisfies ReadyRoomAggregate;

describe("Effect Ready Room repository", () => {
  test("preserves v3 Redis keys and the remaining room TTL on create", async () => {
    const calls: Array<{
      script: string;
      keys: ReadonlyArray<string>;
      arguments_: ReadonlyArray<string | number>;
    }> = [];
    const redis: ReadyRoomRedis = {
      getJson: () => Effect.succeed(null),
      eval: <A>(
        script: string,
        keys: ReadonlyArray<string>,
        arguments_: ReadonlyArray<string | number>,
      ) => {
        calls.push({ script, keys, arguments_ });
        return Effect.succeed(["CREATED"] as A);
      },
    };

    const result = await Effect.runPromise(
      makeReadyRoomRepository(redis, clock).create(aggregate()),
    );

    expect(result.status).toBe("created");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.script).toBe(CREATE_READY_ROOM_SCRIPT);
    expect(calls[0]?.keys).toEqual([
      "party-ready-room:v3:room:notification-1",
      "party-ready-room:v3:organizer:discord-1",
      "party-ready-room:v3:character:Tempest:character-1",
    ]);
    expect(calls[0]?.arguments_.at(-1)).toBe(1800);
  });

  test("maps a Redis CAS mismatch to a typed conflict result", async () => {
    const redis: ReadyRoomRedis = {
      getJson: () => Effect.succeed(null),
      eval: <A>(script: string) => {
        expect(script).toBe(COMMIT_READY_ROOM_SCRIPT);
        return Effect.succeed(["CONFLICT"] as A);
      },
    };
    const current = aggregate();
    const next = aggregate({ revision: 2 });

    await expect(
      Effect.runPromise(
        makeReadyRoomRepository(redis, clock).commit(current, next),
      ),
    ).resolves.toEqual({ status: "conflict" });
  });

  test("does not execute Redis when the aggregate already expired", async () => {
    let evalCount = 0;
    const redis: ReadyRoomRedis = {
      getJson: () => Effect.succeed(null),
      eval: <A>() => {
        evalCount += 1;
        return Effect.succeed([] as A);
      },
    };

    await expect(
      Effect.runPromise(
        makeReadyRoomRepository(redis, clock).create(
          aggregate({ expiresAt: "2026-09-02T09:59:59.000Z" }),
        ),
      ),
    ).rejects.toThrow("Ready Room must expire in the future");
    expect(evalCount).toBe(0);
  });
});
