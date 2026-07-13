import { describe, expect, it, vi } from "vitest";
import { ReadyRoomRedisRepository } from "src/messaging/ready-room/ready-room-redis.repository";
import type { ReadyRoomAggregate } from "src/messaging/ready-room/ready-room.types";

const aggregate: ReadyRoomAggregate = {
  notificationId: "room-1",
  organizerDiscordId: "organizer",
  organizerCharacter: {
    accountId: "account-organizer",
    characterId: "character-organizer",
    icon: "organizer.gif",
    lvl: 200,
    nick: "Organizer",
    prof: "w",
  },
  guildIds: ["guild-1"],
  world: "Fobos",
  status: "ACTIVE",
  revision: 1,
  createdAt: "2026-07-13T10:00:00.000Z",
  updatedAt: "2026-07-13T10:00:00.000Z",
  expiresAt: "2026-07-13T10:30:00.000Z",
  readyCheck: null,
  participants: {},
};

describe("ReadyRoomRedisRepository", () => {
  it("creates an aggregate and organizer index with the fixed room TTL", async () => {
    const redis = {
      get: vi
        .fn<(key: string) => Promise<string | null>>()
        .mockResolvedValue(null),
      eval: vi
        .fn<
          (
            script: string,
            keys: string[],
            args: Array<string | number>,
          ) => Promise<unknown>
        >()
        .mockResolvedValue(["CREATED"]),
    };
    const repository = new ReadyRoomRedisRepository(redis as never, () =>
      Date.parse("2026-07-13T10:00:00.000Z"),
    );

    const result = await repository.create(aggregate);

    expect(result).toEqual({ status: "created", aggregate });
    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      [
        "party-ready-room:room:room-1",
        "party-ready-room:organizer:organizer",
        "party-ready-room:room:room-1",
      ],
      [JSON.stringify(aggregate), "room-1", "", 1800],
    );
  });

  it("reads an aggregate without exposing Redis serialization", async () => {
    const redis = {
      getJson: vi
        .fn<(key: string) => Promise<ReadyRoomAggregate | null>>()
        .mockResolvedValue(aggregate),
      eval: vi.fn<() => Promise<unknown>>(),
    };
    const repository = new ReadyRoomRedisRepository(redis as never);

    await expect(repository.get("room-1")).resolves.toEqual(aggregate);
    expect(redis.getJson).toHaveBeenCalledWith("party-ready-room:room:room-1");
  });
});
