import type { PartyReadyRoomParticipant } from "@lootlog/schema/party-ready-room";
import { describe, expect, it, vi } from "#test/bun-test";
import { ReadyRoomRedisRepository } from "#src/messaging/ready-room/ready-room-redis.repository";
import type { ReadyRoomAggregate } from "#src/messaging/ready-room/ready-room.types";

const now = Date.parse("2026-07-13T10:00:00.000Z");

function createParticipant(
  participantId: string,
  discordId: string,
  characterId: string,
): PartyReadyRoomParticipant {
  return {
    participantId,
    discordId,
    character: {
      accountId: `account-${characterId}`,
      characterId,
      icon: `${characterId}.gif`,
      lvl: 190,
      nick: characterId,
      prof: "m",
    },
    partyPresence: "OUTSIDE",
    createdAt: "2026-07-13T10:00:00.000Z",
    updatedAt: "2026-07-13T10:00:00.000Z",
  };
}

const aggregate: ReadyRoomAggregate = {
  schemaVersion: 3,
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
  participants: {},
};

describe("ReadyRoomRedisRepository", () => {
  it("atomically creates the v3 room, organizer index, and organizer character lock", async () => {
    const redis = {
      eval: vi.fn<() => Promise<unknown>>().mockResolvedValue(["CREATED"]),
    };
    const repository = new ReadyRoomRedisRepository(redis as never, () => now);

    await expect(repository.create(aggregate)).resolves.toEqual({
      status: "created",
      aggregate,
    });
    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      [
        "party-ready-room:v3:room:room-1",
        "party-ready-room:v3:organizer:organizer",
        "party-ready-room:v3:character:Fobos:character-organizer",
      ],
      ["party-ready-room:v3:room:", JSON.stringify(aggregate), "room-1", 1800],
    );
  });

  it("reports a character lock held by another active room", async () => {
    const redis = {
      eval: vi
        .fn<() => Promise<unknown>>()
        .mockResolvedValue(["JOINED_ELSEWHERE", "room-2"]),
    };
    const repository = new ReadyRoomRedisRepository(redis as never, () => now);

    await expect(repository.create(aggregate)).resolves.toEqual({
      status: "joined-elsewhere",
      notificationId: "room-2",
    });
  });

  it("reads only the v3 keyspace", async () => {
    const redis = {
      getJson: vi
        .fn<(key: string) => Promise<ReadyRoomAggregate | null>>()
        .mockResolvedValue(aggregate),
    };
    const repository = new ReadyRoomRedisRepository(redis as never);

    await expect(repository.get("room-1")).resolves.toEqual(aggregate);
    expect(redis.getJson).toHaveBeenCalledWith(
      "party-ready-room:v3:room:room-1",
    );
  });

  it("atomically joins and locks a participant character", async () => {
    const redis = {
      eval: vi.fn<() => Promise<unknown>>().mockResolvedValue(["COMMITTED"]),
    };
    const repository = new ReadyRoomRedisRepository(redis as never, () => now);
    const participant = createParticipant(
      "participant-1",
      "shared-discord",
      "character-1",
    );
    const next: ReadyRoomAggregate = {
      ...aggregate,
      revision: 2,
      participants: { "participant-1": participant },
    };

    await expect(
      repository.join(aggregate, next, "participant-1"),
    ).resolves.toEqual({ status: "committed", aggregate: next });
    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      [
        "party-ready-room:v3:room:room-1",
        "party-ready-room:v3:user:shared-discord",
        "party-ready-room:v3:character:Fobos:character-1",
      ],
      [
        JSON.stringify(aggregate),
        JSON.stringify(next),
        "room-1",
        Date.parse(aggregate.expiresAt),
        1800,
        "party-ready-room:v3:room:",
      ],
    );
  });

  it("releases one character lock while retaining a shared Discord index", async () => {
    const redis = {
      eval: vi.fn<() => Promise<unknown>>().mockResolvedValue(["COMMITTED"]),
    };
    const repository = new ReadyRoomRedisRepository(redis as never, () => now);
    const first = createParticipant(
      "participant-1",
      "shared-discord",
      "character-1",
    );
    const second = createParticipant(
      "participant-2",
      "shared-discord",
      "character-2",
    );
    const expected: ReadyRoomAggregate = {
      ...aggregate,
      participants: { "participant-1": first, "participant-2": second },
    };
    const next: ReadyRoomAggregate = {
      ...expected,
      revision: 2,
      participants: { "participant-2": second },
    };

    await repository.exitParticipant(expected, next, "participant-1");

    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      [
        "party-ready-room:v3:room:room-1",
        "party-ready-room:v3:user:shared-discord",
        "party-ready-room:v3:character:Fobos:character-1",
      ],
      [JSON.stringify(expected), JSON.stringify(next), "room-1", 1800, 1],
    );
  });

  it("deduplicates organizer and participant indexes before loading rooms", async () => {
    const redis = {
      eval: vi
        .fn<() => Promise<unknown>>()
        .mockResolvedValueOnce(["room-1", "room-1"]),
      getJson: vi
        .fn<(key: string) => Promise<ReadyRoomAggregate | null>>()
        .mockResolvedValue(aggregate),
    };
    const repository = new ReadyRoomRedisRepository(redis as never, () => now);

    await expect(repository.findForUser("organizer")).resolves.toEqual([
      aggregate,
    ]);
    expect(redis.getJson).toHaveBeenCalledOnce();
    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      [
        "party-ready-room:v3:organizer:organizer",
        "party-ready-room:v3:user:organizer",
      ],
      [now],
    );
  });

  it("stores a short cancellation tombstone and clears every character lock", async () => {
    const redis = {
      eval: vi.fn<() => Promise<unknown>>().mockResolvedValue(["COMMITTED"]),
    };
    const repository = new ReadyRoomRedisRepository(redis as never, () => now);
    const first = createParticipant(
      "participant-1",
      "participant-1",
      "character-1",
    );
    const second = createParticipant(
      "participant-2",
      "participant-2",
      "character-2",
    );
    const expected: ReadyRoomAggregate = {
      ...aggregate,
      participants: { "participant-1": first, "participant-2": second },
    };
    const next: ReadyRoomAggregate = {
      ...expected,
      status: "CANCELLED",
      revision: 2,
    };

    await repository.terminate(expected, next);

    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      [
        "party-ready-room:v3:room:room-1",
        "party-ready-room:v3:organizer:organizer",
        "party-ready-room:v3:character:Fobos:character-organizer",
        "party-ready-room:v3:user:participant-1",
        "party-ready-room:v3:character:Fobos:character-1",
        "party-ready-room:v3:user:participant-2",
        "party-ready-room:v3:character:Fobos:character-2",
      ],
      [JSON.stringify(expected), JSON.stringify(next), "room-1", 60],
    );
  });
});
