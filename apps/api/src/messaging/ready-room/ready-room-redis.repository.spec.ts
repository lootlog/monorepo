import { describe, expect, it, vi } from "vitest";
import { ReadyRoomRedisRepository } from "src/messaging/ready-room/ready-room-redis.repository";
import type { ReadyRoomAggregate } from "src/messaging/ready-room/ready-room.types";

const aggregate: ReadyRoomAggregate = {
  schemaVersion: 2,
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
        "party-ready-room:v2:room:room-1",
        "party-ready-room:v2:organizer:organizer",
        "party-ready-room:v2:room:room-1",
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
    expect(redis.getJson).toHaveBeenCalledWith(
      "party-ready-room:v2:room:room-1",
    );
  });

  it("preserves the original expiry when committing aggregate-only changes", async () => {
    const redis = {
      eval: vi.fn<() => Promise<unknown>>().mockResolvedValue(["COMMITTED"]),
    };
    const repository = new ReadyRoomRedisRepository(redis as never, () =>
      Date.parse("2026-07-13T10:10:00.000Z"),
    );
    const next = { ...aggregate, revision: 2 };

    await expect(repository.commit(aggregate, next)).resolves.toEqual({
      status: "committed",
      aggregate: next,
    });
    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      ["party-ready-room:v2:room:room-1"],
      [JSON.stringify(aggregate), JSON.stringify(next), 1200],
    );
  });

  it("atomically releases participant indexes during an exit", async () => {
    const redis = {
      eval: vi.fn<() => Promise<unknown>>().mockResolvedValue(["COMMITTED"]),
    };
    const repository = new ReadyRoomRedisRepository(redis as never, () =>
      Date.parse("2026-07-13T10:00:00.000Z"),
    );
    const participant = {
      participantId: "participant-id",
      applicationVersion: 1,
      discordId: "participant",
      character: {
        accountId: "account-participant",
        characterId: "character-participant",
        icon: "participant.gif",
        lvl: 190,
        nick: "Participant",
        prof: "m",
      },
      application: "ACCEPTED" as const,
      readiness: "NOT_REQUESTED" as const,
      invitation: {
        status: "NOT_MARKED" as const,
        source: null,
        commandId: null,
        batchId: null,
        reservationExpiresAt: null,
        updatedAt: "2026-07-13T10:00:00.000Z",
      },
      partyPresence: "OUTSIDE" as const,
      createdAt: "2026-07-13T10:00:00.000Z",
      updatedAt: "2026-07-13T10:00:00.000Z",
    };
    const expected = {
      ...aggregate,
      participants: { "participant-id": participant },
    };
    const next = {
      ...expected,
      revision: 2,
      participants: {
        "participant-id": { ...participant, application: "WITHDRAWN" as const },
      },
    };

    await repository.exitParticipant(expected, next, "participant-id");

    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      [
        "party-ready-room:v2:room:room-1",
        "party-ready-room:v2:user:participant",
        "party-ready-room:v2:accepted:participant:account-participant:character-participant",
      ],
      [JSON.stringify(expected), JSON.stringify(next), "room-1", 1800, 0],
    );
  });

  it("retains the user-room index while another owned participant remains active", async () => {
    const redis = {
      eval: vi.fn<() => Promise<unknown>>().mockResolvedValue(["COMMITTED"]),
    };
    const repository = new ReadyRoomRedisRepository(redis as never, () =>
      Date.parse("2026-07-13T10:00:00.000Z"),
    );
    const createParticipant = (participantId: string, characterId: string) => ({
      participantId,
      applicationVersion: 1,
      discordId: "shared-participant",
      character: {
        accountId: `account-${characterId}`,
        characterId,
        icon: `${characterId}.gif`,
        lvl: 190,
        nick: characterId,
        prof: "m",
      },
      application: "ACCEPTED" as const,
      readiness: "NOT_REQUESTED" as const,
      invitation: {
        status: "NOT_MARKED" as const,
        source: null,
        commandId: null,
        batchId: null,
        reservationExpiresAt: null,
        updatedAt: "2026-07-13T10:00:00.000Z",
      },
      partyPresence: "OUTSIDE" as const,
      createdAt: "2026-07-13T10:00:00.000Z",
      updatedAt: "2026-07-13T10:00:00.000Z",
    });
    const firstParticipant = createParticipant("participant-1", "character-1");
    const secondParticipant = createParticipant("participant-2", "character-2");
    const expected: ReadyRoomAggregate = {
      ...aggregate,
      participants: {
        "participant-1": firstParticipant,
        "participant-2": secondParticipant,
      },
    };
    const next: ReadyRoomAggregate = {
      ...expected,
      revision: 2,
      participants: {
        ...expected.participants,
        "participant-1": {
          ...firstParticipant,
          application: "DECLINED",
        },
      },
    };

    await repository.exitParticipant(expected, next, "participant-1");

    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      [
        "party-ready-room:v2:room:room-1",
        "party-ready-room:v2:user:shared-participant",
        "party-ready-room:v2:accepted:shared-participant:account-character-1:character-1",
      ],
      [JSON.stringify(expected), JSON.stringify(next), "room-1", 1800, 1],
    );
  });

  it("deduplicates organizer and user index overlap before loading rooms", async () => {
    const redis = {
      eval: vi
        .fn<() => Promise<unknown>>()
        .mockResolvedValue(["room-1", "room-1"]),
      getJson: vi
        .fn<(key: string) => Promise<ReadyRoomAggregate | null>>()
        .mockResolvedValue(aggregate),
    };
    const repository = new ReadyRoomRedisRepository(redis as never, () =>
      Date.parse("2026-07-13T10:00:00.000Z"),
    );

    await expect(repository.findForUser("organizer")).resolves.toEqual([
      aggregate,
    ]);
    expect(redis.getJson).toHaveBeenCalledTimes(1);
    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      [
        "party-ready-room:v2:organizer:organizer",
        "party-ready-room:v2:user:organizer",
      ],
      [Date.parse("2026-07-13T10:00:00.000Z")],
    );
  });

  it("uses a short tombstone and clears every terminal secondary index", async () => {
    const redis = {
      eval: vi.fn<() => Promise<unknown>>().mockResolvedValue(["COMMITTED"]),
    };
    const repository = new ReadyRoomRedisRepository(redis as never, () =>
      Date.parse("2026-07-13T10:00:00.000Z"),
    );
    const participant = (
      discordId: string,
    ): ReadyRoomAggregate["participants"][string] => ({
      participantId: `id-${discordId}`,
      applicationVersion: 1,
      discordId,
      character: {
        accountId: `account-${discordId}`,
        characterId: `character-${discordId}`,
        icon: `${discordId}.gif`,
        lvl: 190,
        nick: discordId,
        prof: "m",
      },
      application: "ACCEPTED",
      readiness: "NOT_REQUESTED",
      invitation: {
        status: "NOT_MARKED",
        source: null,
        commandId: null,
        batchId: null,
        reservationExpiresAt: null,
        updatedAt: "2026-07-13T10:00:00.000Z",
      },
      partyPresence: "OUTSIDE",
      createdAt: "2026-07-13T10:00:00.000Z",
      updatedAt: "2026-07-13T10:00:00.000Z",
    });
    const expected: ReadyRoomAggregate = {
      ...aggregate,
      participants: {
        "id-participant-1": participant("participant-1"),
        "id-participant-2": participant("participant-2"),
      },
    };
    const next: ReadyRoomAggregate = {
      ...expected,
      status: "CLOSED",
      revision: 2,
    };

    await repository.terminate(expected, next);

    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      [
        "party-ready-room:v2:room:room-1",
        "party-ready-room:v2:organizer:organizer",
        "party-ready-room:v2:user:participant-1",
        "party-ready-room:v2:accepted:participant-1:account-participant-1:character-participant-1",
        "party-ready-room:v2:user:participant-2",
        "party-ready-room:v2:accepted:participant-2:account-participant-2:character-participant-2",
      ],
      [JSON.stringify(expected), JSON.stringify(next), "room-1", 60],
    );
  });
});
