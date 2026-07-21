import type { PartyReadyRoomCharacter } from "@lootlog/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CommitReadyRoomResult,
  CreateReadyRoomResult,
  JoinReadyRoomResult,
  ReadyRoomRepository,
} from "src/messaging/ready-room/ready-room.repository";
import { ReadyRoomService } from "src/messaging/ready-room/ready-room.service";
import type { ReadyRoomAggregate } from "src/messaging/ready-room/ready-room.types";

const now = Date.parse("2026-07-13T10:00:00.000Z");

function cloneAggregate(aggregate: ReadyRoomAggregate): ReadyRoomAggregate {
  return structuredClone(aggregate);
}

function characterLockKey(world: string, characterId: string): string {
  return `${world}:${characterId}`;
}

class InMemoryReadyRoomRepository implements ReadyRoomRepository {
  private readonly aggregates = new Map<string, ReadyRoomAggregate>();
  private readonly organizerRooms = new Map<string, string>();
  private readonly characterRooms = new Map<string, string>();
  private readonly userRooms = new Map<string, Set<string>>();
  joinConflictsRemaining = 0;
  joinCalls = 0;

  create(aggregate: ReadyRoomAggregate): Promise<CreateReadyRoomResult> {
    const organizerRoomId = this.organizerRooms.get(
      aggregate.organizerDiscordId,
    );
    if (organizerRoomId && this.isActive(organizerRoomId)) {
      return Promise.resolve({
        status: "active-room-exists",
        notificationId: organizerRoomId,
      });
    }
    const characterRoomId = this.characterRooms.get(
      characterLockKey(
        aggregate.world,
        aggregate.organizerCharacter.characterId,
      ),
    );
    if (characterRoomId && this.isActive(characterRoomId)) {
      return Promise.resolve({
        status: "joined-elsewhere",
        notificationId: characterRoomId,
      });
    }
    if (this.aggregates.has(aggregate.notificationId)) {
      return Promise.resolve({ status: "room-exists" });
    }

    this.save(aggregate);
    this.organizerRooms.set(
      aggregate.organizerDiscordId,
      aggregate.notificationId,
    );
    this.characterRooms.set(
      characterLockKey(
        aggregate.world,
        aggregate.organizerCharacter.characterId,
      ),
      aggregate.notificationId,
    );
    return Promise.resolve({
      status: "created",
      aggregate: cloneAggregate(aggregate),
    });
  }

  get(notificationId: string): Promise<ReadyRoomAggregate | null> {
    const aggregate = this.aggregates.get(notificationId);
    return Promise.resolve(aggregate ? cloneAggregate(aggregate) : null);
  }

  findForUser(discordId: string): Promise<ReadyRoomAggregate[]> {
    const roomIds = new Set(this.userRooms.get(discordId) ?? []);
    const organizerRoomId = this.organizerRooms.get(discordId);
    if (organizerRoomId) roomIds.add(organizerRoomId);
    return Promise.resolve(
      [...roomIds].flatMap((notificationId) => {
        const aggregate = this.aggregates.get(notificationId);
        return aggregate ? [cloneAggregate(aggregate)] : [];
      }),
    );
  }

  commit(
    expected: ReadyRoomAggregate,
    next: ReadyRoomAggregate,
  ): Promise<CommitReadyRoomResult> {
    if (!this.matches(expected)) {
      return Promise.resolve(this.missingOrConflict(expected));
    }
    this.save(next);
    return Promise.resolve({
      status: "committed",
      aggregate: cloneAggregate(next),
    });
  }

  join(
    expected: ReadyRoomAggregate,
    next: ReadyRoomAggregate,
    participantId: string,
  ): Promise<JoinReadyRoomResult> {
    this.joinCalls += 1;
    if (this.joinConflictsRemaining > 0) {
      this.joinConflictsRemaining -= 1;
      return Promise.resolve({ status: "conflict" });
    }
    if (!this.matches(expected)) {
      return Promise.resolve(this.missingOrConflict(expected));
    }
    const participant = next.participants[participantId];
    if (!participant) return Promise.resolve({ status: "conflict" });
    const lockKey = characterLockKey(
      next.world,
      participant.character.characterId,
    );
    const occupiedRoomId = this.characterRooms.get(lockKey);
    if (occupiedRoomId && occupiedRoomId !== next.notificationId) {
      return Promise.resolve({
        status: "joined-elsewhere",
        notificationId: occupiedRoomId,
      });
    }

    this.save(next);
    this.characterRooms.set(lockKey, next.notificationId);
    const roomIds = this.userRooms.get(participant.discordId) ?? new Set();
    roomIds.add(next.notificationId);
    this.userRooms.set(participant.discordId, roomIds);
    return Promise.resolve({
      status: "committed",
      aggregate: cloneAggregate(next),
    });
  }

  exitParticipant(
    expected: ReadyRoomAggregate,
    next: ReadyRoomAggregate,
    participantId: string,
  ): Promise<CommitReadyRoomResult> {
    if (!this.matches(expected)) {
      return Promise.resolve(this.missingOrConflict(expected));
    }
    const participant = expected.participants[participantId];
    if (!participant) return Promise.resolve({ status: "conflict" });
    this.save(next);
    this.characterRooms.delete(
      characterLockKey(expected.world, participant.character.characterId),
    );
    const hasAnotherEntry = Object.values(next.participants).some(
      ({ discordId }) => discordId === participant.discordId,
    );
    if (!hasAnotherEntry) {
      this.userRooms.get(participant.discordId)?.delete(next.notificationId);
    }
    return Promise.resolve({
      status: "committed",
      aggregate: cloneAggregate(next),
    });
  }

  terminate(
    expected: ReadyRoomAggregate,
    next: ReadyRoomAggregate,
  ): Promise<CommitReadyRoomResult> {
    if (!this.matches(expected)) {
      return Promise.resolve(this.missingOrConflict(expected));
    }
    this.save(next);
    this.organizerRooms.delete(expected.organizerDiscordId);
    this.characterRooms.delete(
      characterLockKey(expected.world, expected.organizerCharacter.characterId),
    );
    for (const participant of Object.values(expected.participants)) {
      this.characterRooms.delete(
        characterLockKey(expected.world, participant.character.characterId),
      );
      this.userRooms
        .get(participant.discordId)
        ?.delete(expected.notificationId);
    }
    return Promise.resolve({
      status: "committed",
      aggregate: cloneAggregate(next),
    });
  }

  replace(aggregate: ReadyRoomAggregate): void {
    this.save(aggregate);
  }

  private save(aggregate: ReadyRoomAggregate): void {
    this.aggregates.set(aggregate.notificationId, cloneAggregate(aggregate));
  }

  private isActive(notificationId: string): boolean {
    return this.aggregates.get(notificationId)?.status === "ACTIVE";
  }

  private matches(expected: ReadyRoomAggregate): boolean {
    const current = this.aggregates.get(expected.notificationId);
    return (
      current !== undefined &&
      JSON.stringify(current) === JSON.stringify(expected)
    );
  }

  private missingOrConflict(
    expected: ReadyRoomAggregate,
  ): CommitReadyRoomResult {
    return this.aggregates.has(expected.notificationId)
      ? { status: "conflict" }
      : { status: "missing" };
  }
}

function createCharacter(
  characterId: string,
  overrides: Partial<PartyReadyRoomCharacter> = {},
): PartyReadyRoomCharacter {
  return {
    accountId: `account-${characterId}`,
    characterId,
    icon: `${characterId}.gif`,
    lvl: 190,
    nick: characterId,
    prof: "m",
    ...overrides,
  };
}

function getErrorCode(error: unknown): unknown {
  return (error as { getResponse?: () => unknown }).getResponse?.();
}

describe("ReadyRoomService", () => {
  let repository: InMemoryReadyRoomRepository;
  let publisher: {
    publish: ReturnType<
      typeof vi.fn<
        (
          aggregate: ReadyRoomAggregate,
          recipientDiscordIds: string[],
        ) => Promise<void>
      >
    >;
  };
  let service: ReadyRoomService;
  let participantNumber: number;
  const chatService = {
    endPartyGatheringMessages:
      vi.fn<(notificationId: string, guildIds: string[]) => Promise<void>>(),
  };

  beforeEach(() => {
    repository = new InMemoryReadyRoomRepository();
    publisher = {
      publish: vi
        .fn<
          (
            aggregate: ReadyRoomAggregate,
            recipientDiscordIds: string[],
          ) => Promise<void>
        >()
        .mockResolvedValue(undefined),
    };
    participantNumber = 0;
    chatService.endPartyGatheringMessages.mockReset().mockResolvedValue();
    service = new ReadyRoomService(
      repository,
      chatService as never,
      () => now,
      () => "generated-room",
      publisher as never,
      () => `participant-${++participantNumber}`,
    );
  });

  function createRoom(
    notificationId: string,
    organizerDiscordId = `organizer-${notificationId}`,
    organizerCharacter = createCharacter(`organizer-${notificationId}`, {
      lvl: 200,
      prof: "w",
    }),
    overrides: Partial<{
      guildIds: string[];
      minLvl: number;
      maxLvl: number;
      world: string;
    }> = {},
  ) {
    return service.create({
      notificationId,
      organizerDiscordId,
      organizerCharacter,
      guildIds: overrides.guildIds ?? ["guild-1"],
      world: overrides.world ?? "Fobos",
      minLvl: overrides.minLvl,
      maxLvl: overrides.maxLvl,
    });
  }

  function joinRoom(
    notificationId: string,
    participantDiscordId: string,
    character: PartyReadyRoomCharacter,
  ) {
    return service.join({
      notificationId,
      participantDiscordId,
      character,
      world: "Fobos",
      accessibleGuildIds: ["guild-1"],
    });
  }

  it("creates v3 rooms and locks both organizer identity and character", async () => {
    const organizerCharacter = createCharacter("organizer-character", {
      lvl: 200,
    });
    const projection = await createRoom(
      "room-1",
      "organizer",
      organizerCharacter,
    );

    expect(projection).toMatchObject({
      schemaVersion: 3,
      notificationId: "room-1",
      viewer: "ORGANIZER",
      revision: 1,
      participants: {},
    });
    expect(publisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({ notificationId: "room-1" }),
      ["organizer"],
    );

    const sameOrganizerError = await createRoom(
      "room-2",
      "organizer",
      createCharacter("other-character"),
    ).catch((error: unknown) => error);
    expect(getErrorCode(sameOrganizerError)).toMatchObject({
      code: "ACTIVE_GATHERING_EXISTS",
      notificationId: "room-1",
    });

    const sameCharacterError = await createRoom(
      "room-3",
      "other-organizer",
      organizerCharacter,
    ).catch((error: unknown) => error);
    expect(getErrorCode(sameCharacterError)).toMatchObject({
      code: "ALREADY_JOINED_ELSEWHERE",
      notificationId: "room-1",
    });
  });

  it("turns an application directly into an active participant entry", async () => {
    await createRoom("room-1");
    const projection = await joinRoom(
      "room-1",
      "participant",
      createCharacter("participant-character"),
    );

    expect(projection).toMatchObject({
      viewer: "PARTICIPANT",
      revision: 2,
      participants: {
        "participant-1": {
          participantId: "participant-1",
          discordId: "participant",
          partyPresence: "OUTSIDE",
        },
      },
    });
    expect(Object.values(projection.participants)[0]).not.toHaveProperty(
      "application",
    );
    expect(publisher.publish).toHaveBeenLastCalledWith(
      expect.objectContaining({ revision: 2 }),
      ["organizer-room-1", "participant"],
    );
  });

  it("keeps two characters under one Discord identity as independent entries", async () => {
    await createRoom("room-1");
    await joinRoom("room-1", "shared", createCharacter("character-1"));
    const projection = await joinRoom(
      "room-1",
      "shared",
      createCharacter("character-2"),
    );

    expect(Object.keys(projection.participants)).toHaveLength(2);
    expect(
      Object.values(projection.participants).map(
        ({ character }) => character.characterId,
      ),
    ).toEqual(["character-1", "character-2"]);
  });

  it("allows different characters in different rooms but locks one character globally", async () => {
    await createRoom("room-1");
    await createRoom("room-2");
    await joinRoom("room-1", "shared", createCharacter("character-1"));

    const occupiedError = await joinRoom(
      "room-2",
      "shared",
      createCharacter("character-1"),
    ).catch((error: unknown) => error);
    expect(getErrorCode(occupiedError)).toMatchObject({
      code: "ALREADY_JOINED_ELSEWHERE",
      notificationId: "room-1",
    });
    await expect(
      joinRoom("room-2", "shared", createCharacter("character-2")),
    ).resolves.toMatchObject({ notificationId: "room-2" });
  });

  it("treats the same owner, character, and room join as idempotent", async () => {
    await createRoom("room-1");
    const character = createCharacter("character-1");
    await joinRoom("room-1", "participant", character);
    const repeatedProjection = await joinRoom(
      "room-1",
      "participant",
      character,
    );

    expect(repeatedProjection.revision).toBe(2);
    expect(Object.keys(repeatedProjection.participants)).toEqual([
      "participant-1",
    ]);
  });

  it("rejects a conflicting representation of a character already in the room", async () => {
    await createRoom("room-1");
    await joinRoom("room-1", "owner", createCharacter("character-1"));

    const error = await joinRoom(
      "room-1",
      "different-owner",
      createCharacter("character-1", { accountId: "different-account" }),
    ).catch((caughtError: unknown) => caughtError);

    expect(getErrorCode(error)).toEqual({ code: "CHARACTER_ALREADY_JOINED" });
  });

  it("validates guild, world, and level eligibility before joining", async () => {
    await createRoom("room-1", undefined, undefined, {
      minLvl: 180,
      maxLvl: 200,
    });
    const baseCommand = {
      notificationId: "room-1",
      participantDiscordId: "participant",
      character: createCharacter("character-1", { lvl: 190 }),
      world: "Fobos",
      accessibleGuildIds: ["guild-1"],
    };

    const errors = await Promise.all(
      [
        { ...baseCommand, accessibleGuildIds: ["other-guild"] },
        { ...baseCommand, world: "Aldous" },
        {
          ...baseCommand,
          character: createCharacter("character-1", { lvl: 170 }),
        },
      ].map((command) =>
        service.join(command).catch((caughtError: unknown) => caughtError),
      ),
    );
    for (const error of errors) {
      expect(getErrorCode(error)).toEqual({ code: "INELIGIBLE_CHARACTER" });
    }
  });

  it("withdraws one alt with UPSERT and the last alt with REMOVE", async () => {
    await createRoom("room-1");
    await joinRoom("room-1", "shared", createCharacter("character-1"));
    await joinRoom("room-1", "shared", createCharacter("character-2"));
    const beforeWithdraw = await service.get({
      notificationId: "room-1",
      viewerDiscordId: "shared",
      accessibleGuildIds: ["guild-1"],
    });
    const [firstParticipantId, secondParticipantId] = Object.keys(
      beforeWithdraw.participants,
    );

    await expect(
      service.withdraw({
        notificationId: "room-1",
        participantDiscordId: "shared",
        participantId: firstParticipantId,
      }),
    ).resolves.toMatchObject({
      type: "UPSERT",
      projection: {
        participants: {
          [secondParticipantId]: { participantId: secondParticipantId },
        },
      },
    });
    await expect(
      service.withdraw({
        notificationId: "room-1",
        participantDiscordId: "shared",
        participantId: secondParticipantId,
      }),
    ).resolves.toEqual({
      schemaVersion: 3,
      type: "REMOVE",
      notificationId: "room-1",
      revision: 5,
    });
  });

  it("lets the organizer remove a participant without invite-state bookkeeping", async () => {
    await createRoom("room-1", "organizer");
    await joinRoom("room-1", "participant", createCharacter("character-1"));

    await expect(
      service.remove({
        notificationId: "room-1",
        organizerDiscordId: "organizer",
        participantId: "participant-1",
        expectedRevision: 2,
      }),
    ).resolves.toMatchObject({
      schemaVersion: 3,
      type: "UPSERT",
      projection: { revision: 3, participants: {} },
    });
    expect(publisher.publish).toHaveBeenLastCalledWith(
      expect.objectContaining({ revision: 3, participants: {} }),
      ["organizer", "participant"],
    );
  });

  it("resolves only unique outside invitation targets without mutating the room", async () => {
    await createRoom("room-1", "organizer");
    await joinRoom("room-1", "participant-1", createCharacter("character-1"));
    await joinRoom("room-1", "participant-2", createCharacter("character-2"));
    const aggregate = await repository.get("room-1");
    if (!aggregate) throw new Error("missing fixture room");
    aggregate.participants["participant-2"].partyPresence = "IN_PARTY";
    aggregate.participants["duplicate-character"] = {
      ...structuredClone(aggregate.participants["participant-1"]),
      participantId: "duplicate-character",
    };
    repository.replace(aggregate);
    publisher.publish.mockClear();

    await expect(
      service.resolveInvitationTargets({
        notificationId: "room-1",
        organizerDiscordId: "organizer",
        participantIds: [
          "participant-1",
          "participant-1",
          "participant-2",
          "duplicate-character",
          "missing",
        ],
      }),
    ).resolves.toEqual({
      targets: [{ participantId: "participant-1", characterId: "character-1" }],
    });
    expect((await repository.get("room-1"))?.revision).toBe(3);
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it("projects complete organizer party snapshots, including an empty party", async () => {
    await createRoom("room-1", "organizer", createCharacter("organizer"));
    await joinRoom("room-1", "participant-1", createCharacter("character-1"));
    await joinRoom("room-1", "participant-2", createCharacter("character-2"));

    const inParty = await service.observeParty({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      organizerAccountId: "account-organizer",
      organizerCharacterId: "organizer",
      memberCharacterIds: ["character-1"],
    });
    expect(inParty.participants).toMatchObject({
      "participant-1": { partyPresence: "IN_PARTY" },
      "participant-2": { partyPresence: "OUTSIDE" },
    });

    const emptyParty = await service.observeParty({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      organizerAccountId: "account-organizer",
      organizerCharacterId: "organizer",
      memberCharacterIds: [],
    });
    expect(emptyParty.participants["participant-1"].partyPresence).toBe(
      "OUTSIDE",
    );

    const error = await service
      .observeParty({
        notificationId: "room-1",
        organizerDiscordId: "organizer",
        organizerAccountId: "different-account",
        organizerCharacterId: "organizer",
        memberCharacterIds: [],
      })
      .catch((caughtError: unknown) => caughtError);
    expect(getErrorCode(error)).toEqual({ code: "FORBIDDEN" });
  });

  it("cancels with REMOVE updates and releases organizer and participant character locks", async () => {
    const organizerCharacter = createCharacter("organizer-character");
    const participantCharacter = createCharacter("participant-character");
    await createRoom("room-1", "organizer", organizerCharacter);
    await joinRoom("room-1", "participant", participantCharacter);

    await expect(
      service.cancel({
        notificationId: "room-1",
        organizerDiscordId: "organizer",
        expectedRevision: 2,
      }),
    ).resolves.toEqual({
      schemaVersion: 3,
      type: "REMOVE",
      notificationId: "room-1",
      revision: 3,
    });
    expect(publisher.publish).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "CANCELLED", revision: 3 }),
      ["organizer", "participant"],
    );
    expect(chatService.endPartyGatheringMessages).toHaveBeenCalledWith(
      "room-1",
      ["guild-1"],
    );
    expect(
      chatService.endPartyGatheringMessages.mock.invocationCallOrder[0],
    ).toBeLessThan(publisher.publish.mock.invocationCallOrder.at(-1) ?? 0);

    await expect(
      createRoom("room-2", "organizer", organizerCharacter),
    ).resolves.toMatchObject({ notificationId: "room-2" });
    await createRoom("room-3");
    await expect(
      joinRoom("room-3", "participant", participantCharacter),
    ).resolves.toMatchObject({ notificationId: "room-3" });
  });

  it("stops join CAS retries after four conflicts", async () => {
    await createRoom("room-1");
    repository.joinConflictsRemaining = 4;

    const error = await joinRoom(
      "room-1",
      "participant",
      createCharacter("character-1"),
    ).catch((caughtError: unknown) => caughtError);

    expect(repository.joinCalls).toBe(4);
    expect(getErrorCode(error)).toEqual({ code: "REVISION_CONFLICT" });
  });

  it("lists only live private projections shared through an accessible guild", async () => {
    await createRoom("room-1");
    await joinRoom("room-1", "participant", createCharacter("character-1"));

    await expect(
      service.list({
        viewerDiscordId: "participant",
        accessibleGuildIds: ["other-guild"],
      }),
    ).resolves.toEqual([]);
    await expect(
      service.list({
        viewerDiscordId: "participant",
        accessibleGuildIds: ["guild-1"],
      }),
    ).resolves.toMatchObject([
      {
        notificationId: "room-1",
        viewer: "PARTICIPANT",
        participants: {
          "participant-1": { discordId: "participant" },
        },
      },
    ]);
  });
});
