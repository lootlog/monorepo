import { describe, expect, it } from "vitest";
import { ReadyRoomService } from "src/messaging/ready-room/ready-room.service";
import type {
  CreateReadyRoomResult,
  ReadyRoomRepository,
} from "src/messaging/ready-room/ready-room.repository";
import type { ReadyRoomAggregate } from "src/messaging/ready-room/ready-room.types";

class InMemoryReadyRoomRepository implements ReadyRoomRepository {
  private readonly rooms = new Map<string, ReadyRoomAggregate>();
  private readonly organizerRooms = new Map<string, string>();
  private readonly acceptedRooms = new Map<string, string>();

  private getAcceptedRoomKey(
    participant: ReadyRoomAggregate["participants"][string],
  ): string {
    return `${participant.discordId}:${participant.character.accountId}:${participant.character.characterId}`;
  }

  create(aggregate: ReadyRoomAggregate): Promise<CreateReadyRoomResult> {
    const activeRoomId = this.organizerRooms.get(aggregate.organizerDiscordId);
    if (activeRoomId) {
      return Promise.resolve({
        status: "active-room-exists",
        notificationId: activeRoomId,
      });
    }

    this.rooms.set(aggregate.notificationId, structuredClone(aggregate));
    this.organizerRooms.set(
      aggregate.organizerDiscordId,
      aggregate.notificationId,
    );

    return Promise.resolve({
      status: "created",
      aggregate: structuredClone(aggregate),
    });
  }

  get(notificationId: string): Promise<ReadyRoomAggregate | null> {
    const aggregate = this.rooms.get(notificationId);
    return Promise.resolve(aggregate ? structuredClone(aggregate) : null);
  }

  findForUser(discordId: string): Promise<ReadyRoomAggregate[]> {
    return Promise.resolve(
      [...this.rooms.values()]
        .filter(
          (aggregate) =>
            aggregate.status === "ACTIVE" &&
            (aggregate.organizerDiscordId === discordId ||
              Object.values(aggregate.participants).some(
                (participant) =>
                  participant.discordId === discordId &&
                  (participant.application === "APPLIED" ||
                    participant.application === "ACCEPTED"),
              )),
        )
        .map((aggregate) => structuredClone(aggregate)),
    );
  }

  commit(expected: ReadyRoomAggregate, next: ReadyRoomAggregate) {
    const current = this.rooms.get(expected.notificationId);
    if (!current) return Promise.resolve({ status: "missing" as const });
    if (current.revision !== expected.revision) {
      return Promise.resolve({ status: "conflict" as const });
    }

    this.rooms.set(next.notificationId, structuredClone(next));
    return Promise.resolve({
      status: "committed" as const,
      aggregate: structuredClone(next),
    });
  }

  exitParticipant(
    expected: ReadyRoomAggregate,
    next: ReadyRoomAggregate,
    participantId: string,
  ) {
    const participant = expected.participants[participantId];
    if (!participant) return Promise.resolve({ status: "conflict" as const });
    const acceptedRoomKey = this.getAcceptedRoomKey(participant);
    const acceptedRoomId = this.acceptedRooms.get(acceptedRoomKey);
    const result = this.commit(expected, next);
    return result.then((commitResult) => {
      if (
        commitResult.status === "committed" &&
        acceptedRoomId === expected.notificationId
      ) {
        this.acceptedRooms.delete(acceptedRoomKey);
      }
      return commitResult;
    });
  }

  terminate(expected: ReadyRoomAggregate, next: ReadyRoomAggregate) {
    const result = this.commit(expected, next);
    return result.then((commitResult) => {
      if (commitResult.status === "committed") {
        this.organizerRooms.delete(expected.organizerDiscordId);
        for (const participant of Object.values(expected.participants)) {
          const acceptedRoomKey = this.getAcceptedRoomKey(participant);
          if (
            this.acceptedRooms.get(acceptedRoomKey) === expected.notificationId
          ) {
            this.acceptedRooms.delete(acceptedRoomKey);
          }
        }
      }
      return commitResult;
    });
  }

  saveApplication(
    expected: ReadyRoomAggregate,
    next: ReadyRoomAggregate,
    _participantId: string,
  ) {
    const current = this.rooms.get(expected.notificationId);
    if (!current) return Promise.resolve({ status: "missing" as const });
    if (current.revision !== expected.revision) {
      return Promise.resolve({ status: "conflict" as const });
    }

    this.rooms.set(next.notificationId, structuredClone(next));
    return Promise.resolve({
      status: "committed" as const,
      aggregate: structuredClone(next),
    });
  }

  accept(
    expected: ReadyRoomAggregate,
    next: ReadyRoomAggregate,
    participantId: string,
  ) {
    const participant = next.participants[participantId];
    if (!participant) return Promise.resolve({ status: "conflict" as const });
    const acceptedRoomKey = this.getAcceptedRoomKey(participant);
    const acceptedRoomId = this.acceptedRooms.get(acceptedRoomKey);
    if (acceptedRoomId && acceptedRoomId !== expected.notificationId) {
      return Promise.resolve({
        status: "accepted-elsewhere" as const,
        notificationId: acceptedRoomId,
      });
    }

    const current = this.rooms.get(expected.notificationId);
    if (!current) return Promise.resolve({ status: "missing" as const });
    if (current.revision !== expected.revision) {
      return Promise.resolve({ status: "conflict" as const });
    }

    this.rooms.set(next.notificationId, structuredClone(next));
    this.acceptedRooms.set(acceptedRoomKey, next.notificationId);
    return Promise.resolve({
      status: "committed" as const,
      aggregate: structuredClone(next),
    });
  }
}

async function getParticipantId(
  repository: ReadyRoomRepository,
  notificationId: string,
  discordId: string,
  characterId?: string,
): Promise<string> {
  const aggregate = await repository.get(notificationId);
  const participant = Object.values(aggregate?.participants ?? {}).find(
    (candidate) =>
      candidate.discordId === discordId &&
      (characterId === undefined ||
        candidate.character.characterId === characterId),
  );
  if (!participant) throw new Error("Missing test participant");
  return participant.participantId;
}

describe("ReadyRoomService", () => {
  it("lists only private projections reachable through a retained guild", async () => {
    const repository = new InMemoryReadyRoomRepository();
    const roomIds = ["room-1", "room-2"];
    const service = new ReadyRoomService(
      repository,
      () => Date.parse("2026-07-13T10:00:00.000Z"),
      () => roomIds.shift() ?? "unexpected-room",
    );
    const character = {
      accountId: "account",
      characterId: "character",
      icon: "character.gif",
      lvl: 200,
      nick: "Character",
      prof: "w",
    };
    const participantCharacter = {
      ...character,
      accountId: "participant-account",
      characterId: "participant-character",
    };
    await service.create({
      organizerDiscordId: "organizer-1",
      organizerCharacter: character,
      guildIds: ["guild-1"],
      world: "Fobos",
    });
    await service.create({
      organizerDiscordId: "organizer-2",
      organizerCharacter: character,
      guildIds: ["guild-2"],
      world: "Fobos",
    });
    await service.apply({
      notificationId: "room-1",
      participantDiscordId: "participant",
      character: participantCharacter,
      world: "Fobos",
      accessibleGuildIds: ["guild-1", "guild-2"],
    });
    await service.apply({
      notificationId: "room-2",
      participantDiscordId: "participant",
      character: participantCharacter,
      world: "Fobos",
      accessibleGuildIds: ["guild-1", "guild-2"],
    });

    await expect(
      service.list({
        viewerDiscordId: "participant",
        accessibleGuildIds: ["guild-1"],
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        notificationId: "room-1",
        viewer: "PARTICIPANT",
      }),
    ]);
    await expect(
      service.get({
        notificationId: "room-2",
        viewerDiscordId: "participant",
        accessibleGuildIds: ["guild-1"],
      }),
    ).rejects.toMatchObject({ response: { code: "FORBIDDEN" } });
  });

  it("deduplicates organizer and participant discovery for one room", async () => {
    const repository = new InMemoryReadyRoomRepository();
    const service = new ReadyRoomService(
      repository,
      () => Date.parse("2026-07-13T10:00:00.000Z"),
      () => "room-1",
    );
    await service.create({
      organizerDiscordId: "organizer",
      organizerCharacter: {
        accountId: "organizer-account",
        characterId: "organizer-character",
        icon: "organizer.gif",
        lvl: 200,
        nick: "Organizer",
        prof: "w",
      },
      guildIds: ["guild-1"],
      world: "Fobos",
    });
    const aggregate = await repository.get("room-1");
    repository.findForUser = () =>
      Promise.resolve([
        structuredClone(aggregate!),
        structuredClone(aggregate!),
      ]);

    await expect(
      service.list({
        viewerDiscordId: "organizer",
        accessibleGuildIds: ["guild-1"],
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        notificationId: "room-1",
        viewer: "ORGANIZER",
      }),
    ]);
  });

  it("creates a live organizer room with a fixed thirty-minute lifetime", async () => {
    const repository = new InMemoryReadyRoomRepository();
    const service = new ReadyRoomService(
      repository,
      () => Date.parse("2026-07-13T10:00:00.000Z"),
      () => "room-1",
    );

    const projection = await service.create({
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
      description: "Titan",
      minLvl: 180,
      maxLvl: 220,
    });

    expect(projection).toMatchObject({
      viewer: "ORGANIZER",
      notificationId: "room-1",
      status: "ACTIVE",
      revision: 1,
      createdAt: "2026-07-13T10:00:00.000Z",
      expiresAt: "2026-07-13T10:30:00.000Z",
      participants: {},
    });
    await expect(repository.get("room-1")).resolves.toMatchObject({
      notificationId: "room-1",
      status: "ACTIVE",
      revision: 1,
      participants: {},
    });
  });

  it("adds one private applicant record after validating room eligibility", async () => {
    const repository = new InMemoryReadyRoomRepository();
    const service = new ReadyRoomService(
      repository,
      () => Date.parse("2026-07-13T10:00:00.000Z"),
      () => "room-1",
    );
    await service.create({
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
      minLvl: 180,
      maxLvl: 220,
    });

    const projection = await service.apply({
      notificationId: "room-1",
      participantDiscordId: "applicant",
      character: {
        accountId: "account-applicant",
        characterId: "character-applicant",
        icon: "applicant.gif",
        lvl: 190,
        nick: "Applicant",
        prof: "m",
      },
      world: "Fobos",
      accessibleGuildIds: ["guild-1", "guild-2"],
    });

    expect(projection).toMatchObject({
      viewer: "PARTICIPANT",
      revision: 2,
    });
    expect(Object.values(projection.participants)).toEqual([
      expect.objectContaining({
        discordId: "applicant",
        application: "APPLIED",
        readiness: "NOT_REQUESTED",
        invitation: expect.objectContaining({ status: "NOT_MARKED" }),
        partyPresence: "OUTSIDE",
      }),
    ]);
  });

  it("keeps separate participant entries for two characters owned by one Discord identity", async () => {
    const repository = new InMemoryReadyRoomRepository();
    const generatedIds = ["room-1", "participant-1", "participant-2"];
    const service = new ReadyRoomService(
      repository,
      () => Date.parse("2026-07-13T10:00:00.000Z"),
      () => generatedIds.shift()!,
      undefined,
      () => generatedIds.shift()!,
    );
    await service.create({
      organizerDiscordId: "organizer",
      organizerCharacter: {
        accountId: "organizer-account",
        characterId: "organizer-character",
        icon: "organizer.gif",
        lvl: 200,
        nick: "Organizer",
        prof: "w",
      },
      guildIds: ["guild-1"],
      world: "Fobos",
    });

    for (const characterNumber of [1, 2]) {
      await service.apply({
        notificationId: "room-1",
        participantDiscordId: "shared-discord",
        character: {
          accountId: `account-${characterNumber}`,
          characterId: `character-${characterNumber}`,
          icon: `character-${characterNumber}.gif`,
          lvl: 190,
          nick: `Character ${characterNumber}`,
          prof: "m",
        },
        world: "Fobos",
        accessibleGuildIds: ["guild-1"],
      });
    }

    await expect(
      service.get({
        notificationId: "room-1",
        viewerDiscordId: "organizer",
        accessibleGuildIds: ["guild-1"],
      }),
    ).resolves.toMatchObject({
      viewer: "ORGANIZER",
      participants: {
        "participant-1": {
          participantId: "participant-1",
          applicationVersion: 1,
          discordId: "shared-discord",
          character: { characterId: "character-1" },
        },
        "participant-2": {
          participantId: "participant-2",
          applicationVersion: 1,
          discordId: "shared-discord",
          character: { characterId: "character-2" },
        },
      },
    });
  });

  it("allows an organizer to apply with a different owned character", async () => {
    const repository = new InMemoryReadyRoomRepository();
    const generatedIds = ["room-1", "participant-alt"];
    const service = new ReadyRoomService(
      repository,
      () => Date.parse("2026-07-13T10:00:00.000Z"),
      () => generatedIds.shift()!,
      undefined,
      () => generatedIds.shift()!,
    );
    await service.create({
      organizerDiscordId: "organizer",
      organizerCharacter: {
        accountId: "main-account",
        characterId: "main-character",
        icon: "main.gif",
        lvl: 200,
        nick: "Main",
        prof: "w",
      },
      guildIds: ["guild-1"],
      world: "Fobos",
    });

    await expect(
      service.apply({
        notificationId: "room-1",
        participantDiscordId: "organizer",
        character: {
          accountId: "alt-account",
          characterId: "alt-character",
          icon: "alt.gif",
          lvl: 190,
          nick: "Alt",
          prof: "p",
        },
        world: "Fobos",
        accessibleGuildIds: ["guild-1"],
      }),
    ).resolves.toMatchObject({
      viewer: "ORGANIZER",
      ownedParticipantIds: ["participant-alt"],
      participants: {
        "participant-alt": {
          participantId: "participant-alt",
          discordId: "organizer",
          character: { characterId: "alt-character" },
        },
      },
    });

    await expect(
      service.apply({
        notificationId: "room-1",
        participantDiscordId: "organizer",
        character: {
          accountId: "main-account",
          characterId: "main-character",
          icon: "main.gif",
          lvl: 200,
          nick: "Main",
          prof: "w",
        },
        world: "Fobos",
        accessibleGuildIds: ["guild-1"],
      }),
    ).rejects.toMatchObject({
      response: { code: "INVALID_STATE_TRANSITION" },
    });
  });

  it("keeps idempotent application versions and increments a reapplication", async () => {
    const repository = new InMemoryReadyRoomRepository();
    const service = new ReadyRoomService(
      repository,
      () => Date.parse("2026-07-13T10:00:00.000Z"),
      () => "room-1",
      undefined,
      () => "participant-1",
    );
    const organizerCharacter = {
      accountId: "organizer-account",
      characterId: "organizer-character",
      icon: "organizer.gif",
      lvl: 200,
      nick: "Organizer",
      prof: "w",
    };
    const participantCharacter = {
      ...organizerCharacter,
      accountId: "participant-account",
      characterId: "participant-character",
      nick: "Participant",
    };
    await service.create({
      organizerDiscordId: "organizer",
      organizerCharacter,
      guildIds: ["guild-1"],
      world: "Fobos",
    });

    const firstApplication = await service.apply({
      notificationId: "room-1",
      participantDiscordId: "participant",
      character: participantCharacter,
      world: "Fobos",
      accessibleGuildIds: ["guild-1"],
    });
    const repeatedApplication = await service.apply({
      notificationId: "room-1",
      participantDiscordId: "participant",
      character: participantCharacter,
      world: "Fobos",
      accessibleGuildIds: ["guild-1"],
    });

    expect(repeatedApplication).toMatchObject({ revision: 2 });
    expect(repeatedApplication.participants["participant-1"]).toMatchObject({
      participantId: "participant-1",
      applicationVersion: 1,
    });
    await service.decline({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      participantId: "participant-1",
      expectedRevision: firstApplication.revision,
    });

    const reapplied = await service.apply({
      notificationId: "room-1",
      participantDiscordId: "participant",
      character: participantCharacter,
      world: "Fobos",
      accessibleGuildIds: ["guild-1"],
    });
    expect(reapplied.participants["participant-1"]).toMatchObject({
      participantId: "participant-1",
      applicationVersion: 2,
      application: "APPLIED",
    });
  });

  it("accepts two different characters of one Discord identity independently", async () => {
    const repository = new InMemoryReadyRoomRepository();
    const roomIds = ["room-1", "room-2"];
    const service = new ReadyRoomService(
      repository,
      () => Date.parse("2026-07-13T10:00:00.000Z"),
      () => roomIds.shift()!,
    );
    const character = {
      accountId: "account",
      characterId: "character",
      icon: "character.gif",
      lvl: 200,
      nick: "Character",
      prof: "w",
    };
    for (const roomNumber of [1, 2]) {
      await service.create({
        organizerDiscordId: `organizer-${roomNumber}`,
        organizerCharacter: {
          ...character,
          characterId: `organizer-character-${roomNumber}`,
        },
        guildIds: ["guild-1"],
        world: "Fobos",
      });
      await service.apply({
        notificationId: `room-${roomNumber}`,
        participantDiscordId: "shared-discord",
        character: {
          ...character,
          accountId: `participant-account-${roomNumber}`,
          characterId: `participant-character-${roomNumber}`,
        },
        world: "Fobos",
        accessibleGuildIds: ["guild-1"],
      });
    }

    for (const roomNumber of [1, 2]) {
      const notificationId = `room-${roomNumber}`;
      await expect(
        service.accept({
          notificationId,
          organizerDiscordId: `organizer-${roomNumber}`,
          participantId: await getParticipantId(
            repository,
            notificationId,
            "shared-discord",
          ),
          expectedRevision: 2,
        }),
      ).resolves.toMatchObject({ revision: 3 });
    }
  });

  it("allows several applications but accepts a participant in only one room", async () => {
    const repository = new InMemoryReadyRoomRepository();
    const roomIds = ["room-1", "room-2"];
    const service = new ReadyRoomService(
      repository,
      () => Date.parse("2026-07-13T10:00:00.000Z"),
      () => roomIds.shift()!,
    );
    const organizerCharacter = {
      accountId: "account-organizer",
      characterId: "character-organizer",
      icon: "organizer.gif",
      lvl: 200,
      nick: "Organizer",
      prof: "w",
    };
    const applicantCharacter = {
      accountId: "account-applicant",
      characterId: "character-applicant",
      icon: "applicant.gif",
      lvl: 190,
      nick: "Applicant",
      prof: "m",
    };

    await service.create({
      organizerDiscordId: "organizer-1",
      organizerCharacter,
      guildIds: ["guild-1"],
      world: "Fobos",
    });
    await service.create({
      organizerDiscordId: "organizer-2",
      organizerCharacter: {
        ...organizerCharacter,
        characterId: "character-organizer-2",
      },
      guildIds: ["guild-1"],
      world: "Fobos",
    });
    for (const notificationId of ["room-1", "room-2"]) {
      await service.apply({
        notificationId,
        participantDiscordId: "applicant",
        character: applicantCharacter,
        world: "Fobos",
        accessibleGuildIds: ["guild-1"],
      });
    }

    const roomOneParticipantId = await getParticipantId(
      repository,
      "room-1",
      "applicant",
    );
    const roomTwoParticipantId = await getParticipantId(
      repository,
      "room-2",
      "applicant",
    );
    const accepted = await service.accept({
      notificationId: "room-1",
      organizerDiscordId: "organizer-1",
      participantId: roomOneParticipantId,
      expectedRevision: 2,
    });

    expect(accepted).toMatchObject({
      viewer: "ORGANIZER",
      revision: 3,
    });
    expect(accepted.participants[roomOneParticipantId]).toMatchObject({
      application: "ACCEPTED",
    });
    await expect(
      service.accept({
        notificationId: "room-2",
        organizerDiscordId: "organizer-2",
        participantId: roomTwoParticipantId,
        expectedRevision: 2,
      }),
    ).rejects.toMatchObject({
      response: {
        code: "ACCEPTED_ELSEWHERE",
        notificationId: "room-1",
      },
    });
  });

  it("starts consecutive ready-check rounds and accepts participant-local responses", async () => {
    const repository = new InMemoryReadyRoomRepository();
    const service = new ReadyRoomService(
      repository,
      () => Date.parse("2026-07-13T10:00:00.000Z"),
      () => "room-1",
    );
    const organizerCharacter = {
      accountId: "account-organizer",
      characterId: "character-organizer",
      icon: "organizer.gif",
      lvl: 200,
      nick: "Organizer",
      prof: "w",
    };
    await service.create({
      organizerDiscordId: "organizer",
      organizerCharacter,
      guildIds: ["guild-1"],
      world: "Fobos",
    });
    const participantIds = new Map<string, string>();
    for (const [participantDiscordId, characterId] of [
      ["participant-1", "character-1"],
      ["participant-2", "character-2"],
    ]) {
      await service.apply({
        notificationId: "room-1",
        participantDiscordId,
        character: {
          ...organizerCharacter,
          accountId: `account-${participantDiscordId}`,
          characterId,
          nick: participantDiscordId,
        },
        world: "Fobos",
        accessibleGuildIds: ["guild-1"],
      });
      const current = await repository.get("room-1");
      const participantId = await getParticipantId(
        repository,
        "room-1",
        participantDiscordId,
      );
      participantIds.set(participantDiscordId, participantId);
      await service.accept({
        notificationId: "room-1",
        organizerDiscordId: "organizer",
        participantId,
        expectedRevision: current!.revision,
      });
    }

    const current = await repository.get("room-1");
    const started = await service.startReadyCheck({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      expectedRevision: current!.revision,
    });
    expect(started.readyCheck).toMatchObject({ roundId: 1 });
    expect(
      started.participants[participantIds.get("participant-1")!].readiness,
    ).toBe("PENDING");
    expect(
      started.participants[participantIds.get("participant-2")!].readiness,
    ).toBe("PENDING");

    await service.apply({
      notificationId: "room-1",
      participantDiscordId: "participant-3",
      character: {
        ...organizerCharacter,
        accountId: "account-participant-3",
        characterId: "character-3",
        nick: "participant-3",
      },
      world: "Fobos",
      accessibleGuildIds: ["guild-1"],
    });
    const beforeMidRoundAccept = await repository.get("room-1");
    const participantThreeId = await getParticipantId(
      repository,
      "room-1",
      "participant-3",
    );
    const acceptedMidRound = await service.accept({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      participantId: participantThreeId,
      expectedRevision: beforeMidRoundAccept!.revision,
    });
    expect(acceptedMidRound.participants[participantThreeId]).toMatchObject({
      application: "ACCEPTED",
      readiness: "PENDING",
    });
    const removedMidRound = await service.remove({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      participantId: participantThreeId,
      expectedRevision: acceptedMidRound.revision,
    });
    expect(removedMidRound.participants[participantThreeId]).toMatchObject({
      application: "DECLINED",
      readiness: "NOT_REQUESTED",
    });

    await Promise.all([
      service.respondToReadyCheck({
        notificationId: "room-1",
        participantDiscordId: "participant-1",
        participantId: participantIds.get("participant-1")!,
        roundId: 1,
        ready: true,
      }),
      service.respondToReadyCheck({
        notificationId: "room-1",
        participantDiscordId: "participant-2",
        participantId: participantIds.get("participant-2")!,
        roundId: 1,
        ready: false,
      }),
    ]);
    const afterReadyResponses = await repository.get("room-1");
    expect(
      afterReadyResponses!.participants[participantIds.get("participant-1")!]
        .readiness,
    ).toBe("READY");
    expect(
      afterReadyResponses!.participants[participantIds.get("participant-2")!]
        .readiness,
    ).toBe("NOT_READY");

    const afterResponses = await repository.get("room-1");
    const restarted = await service.startReadyCheck({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      expectedRevision: afterResponses!.revision,
    });
    expect(restarted.readyCheck).toMatchObject({ roundId: 2 });
    expect(
      restarted.participants[participantIds.get("participant-1")!].readiness,
    ).toBe("PENDING");
    expect(
      restarted.participants[participantIds.get("participant-2")!].readiness,
    ).toBe("PENDING");
  });

  it("rejects participant-local commands targeting another Discord owner's entry", async () => {
    const repository = new InMemoryReadyRoomRepository();
    const service = new ReadyRoomService(
      repository,
      () => Date.parse("2026-07-13T10:00:00.000Z"),
      () => "room-1",
    );
    const character = {
      accountId: "account",
      characterId: "character",
      icon: "character.gif",
      lvl: 200,
      nick: "Character",
      prof: "w",
    };
    await service.create({
      organizerDiscordId: "organizer",
      organizerCharacter: character,
      guildIds: ["guild-1"],
      world: "Fobos",
    });
    for (const participantNumber of [1, 2]) {
      const participantDiscordId = `participant-${participantNumber}`;
      await service.apply({
        notificationId: "room-1",
        participantDiscordId,
        character: {
          ...character,
          accountId: `account-${participantNumber}`,
          characterId: `character-${participantNumber}`,
        },
        world: "Fobos",
        accessibleGuildIds: ["guild-1"],
      });
      const aggregate = await repository.get("room-1");
      await service.accept({
        notificationId: "room-1",
        organizerDiscordId: "organizer",
        participantId: await getParticipantId(
          repository,
          "room-1",
          participantDiscordId,
        ),
        expectedRevision: aggregate!.revision,
      });
    }
    const aggregate = await repository.get("room-1");
    await service.startReadyCheck({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      expectedRevision: aggregate!.revision,
    });
    const otherParticipantId = await getParticipantId(
      repository,
      "room-1",
      "participant-2",
    );

    await expect(
      service.respondToReadyCheck({
        notificationId: "room-1",
        participantDiscordId: "participant-1",
        participantId: otherParticipantId,
        roundId: 1,
        ready: true,
      }),
    ).rejects.toMatchObject({ response: { code: "FORBIDDEN" } });
    await expect(
      service.withdraw({
        notificationId: "room-1",
        participantDiscordId: "participant-1",
        participantId: otherParticipantId,
      }),
    ).rejects.toMatchObject({ response: { code: "FORBIDDEN" } });
  });

  it("withdraws an accepted participant and releases the cross-room lock", async () => {
    const repository = new InMemoryReadyRoomRepository();
    const roomIds = ["room-1", "room-2"];
    const service = new ReadyRoomService(
      repository,
      () => Date.parse("2026-07-13T10:00:00.000Z"),
      () => roomIds.shift()!,
    );
    const organizerCharacter = {
      accountId: "account-organizer",
      characterId: "character-organizer",
      icon: "organizer.gif",
      lvl: 200,
      nick: "Organizer",
      prof: "w",
    };
    const participantCharacter = {
      ...organizerCharacter,
      accountId: "account-participant",
      characterId: "character-participant",
      nick: "Participant",
    };
    for (const organizerDiscordId of ["organizer-1", "organizer-2"]) {
      await service.create({
        organizerDiscordId,
        organizerCharacter: {
          ...organizerCharacter,
          characterId: `character-${organizerDiscordId}`,
        },
        guildIds: ["guild-1"],
        world: "Fobos",
      });
    }
    for (const notificationId of ["room-1", "room-2"]) {
      await service.apply({
        notificationId,
        participantDiscordId: "participant",
        character: participantCharacter,
        world: "Fobos",
        accessibleGuildIds: ["guild-1"],
      });
    }
    const roomOneParticipantId = await getParticipantId(
      repository,
      "room-1",
      "participant",
    );
    const roomTwoParticipantId = await getParticipantId(
      repository,
      "room-2",
      "participant",
    );
    await service.accept({
      notificationId: "room-1",
      organizerDiscordId: "organizer-1",
      participantId: roomOneParticipantId,
      expectedRevision: 2,
    });

    const withdrawn = await service.withdraw({
      notificationId: "room-1",
      participantDiscordId: "participant",
      participantId: roomOneParticipantId,
    });
    expect(withdrawn.participants[roomOneParticipantId]).toMatchObject({
      application: "WITHDRAWN",
      readiness: "NOT_REQUESTED",
      invitation: { status: "NOT_MARKED" },
      partyPresence: "OUTSIDE",
    });
    await expect(
      service.accept({
        notificationId: "room-2",
        organizerDiscordId: "organizer-2",
        participantId: roomTwoParticipantId,
        expectedRevision: 2,
      }),
    ).resolves.toMatchObject({ revision: 3 });
  });

  it("lets the organizer decline applicants and remove accepted participants", async () => {
    const repository = new InMemoryReadyRoomRepository();
    const service = new ReadyRoomService(
      repository,
      () => Date.parse("2026-07-13T10:00:00.000Z"),
      () => "room-1",
    );
    const character = {
      accountId: "account",
      characterId: "character",
      icon: "character.gif",
      lvl: 200,
      nick: "Character",
      prof: "w",
    };
    await service.create({
      organizerDiscordId: "organizer",
      organizerCharacter: character,
      guildIds: ["guild-1"],
      world: "Fobos",
    });
    for (const participantDiscordId of ["declined", "removed"]) {
      await service.apply({
        notificationId: "room-1",
        participantDiscordId,
        character: {
          ...character,
          characterId: `character-${participantDiscordId}`,
        },
        world: "Fobos",
        accessibleGuildIds: ["guild-1"],
      });
    }
    const declinedParticipantId = await getParticipantId(
      repository,
      "room-1",
      "declined",
    );
    const removedParticipantId = await getParticipantId(
      repository,
      "room-1",
      "removed",
    );

    const declined = await service.decline({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      participantId: declinedParticipantId,
      expectedRevision: 3,
    });
    expect(declined.participants[declinedParticipantId]).toMatchObject({
      application: "DECLINED",
      readiness: "NOT_REQUESTED",
    });
    await service.accept({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      participantId: removedParticipantId,
      expectedRevision: 4,
    });
    const removed = await service.remove({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      participantId: removedParticipantId,
      expectedRevision: 5,
    });
    expect(removed.participants[removedParticipantId]).toMatchObject({
      application: "DECLINED",
      readiness: "NOT_REQUESTED",
      invitation: { status: "NOT_MARKED" },
      partyPresence: "OUTSIDE",
    });
  });

  it("reserves independent invitation commands and acknowledges each target idempotently", async () => {
    const repository = new InMemoryReadyRoomRepository();
    const generatedIds = ["room-1", "batch-1", "command-1", "command-2"];
    const service = new ReadyRoomService(
      repository,
      () => Date.parse("2026-07-13T10:00:00.000Z"),
      () => generatedIds.shift()!,
    );
    const character = {
      accountId: "account",
      characterId: "character",
      icon: "character.gif",
      lvl: 200,
      nick: "Character",
      prof: "w",
    };
    await service.create({
      organizerDiscordId: "organizer",
      organizerCharacter: character,
      guildIds: ["guild-1"],
      world: "Fobos",
    });
    const participantIds = new Map<string, string>();
    for (const participantDiscordId of ["participant-1", "participant-2"]) {
      await service.apply({
        notificationId: "room-1",
        participantDiscordId,
        character: {
          ...character,
          characterId: `character-${participantDiscordId}`,
        },
        world: "Fobos",
        accessibleGuildIds: ["guild-1"],
      });
      const aggregate = await repository.get("room-1");
      const participantId = await getParticipantId(
        repository,
        "room-1",
        participantDiscordId,
      );
      participantIds.set(participantDiscordId, participantId);
      await service.accept({
        notificationId: "room-1",
        organizerDiscordId: "organizer",
        participantId,
        expectedRevision: aggregate!.revision,
      });
    }

    const reservation = await service.reserveInvitations({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      targets: ["participant-1", "participant-2"].map((discordId) => ({
        participantId: participantIds.get(discordId)!,
        applicationVersion: 1,
      })),
    });
    expect(reservation.batch).toEqual({
      batchId: "batch-1",
      reservations: [
        {
          participantId: participantIds.get("participant-1"),
          applicationVersion: 1,
          characterId: "character-participant-1",
          commandId: "command-1",
        },
        {
          participantId: participantIds.get("participant-2"),
          applicationVersion: 1,
          characterId: "character-participant-2",
          commandId: "command-2",
        },
      ],
    });
    expect(
      reservation.projection.participants[participantIds.get("participant-1")!]
        .invitation,
    ).toMatchObject({
      status: "COMMAND_RESERVED",
      batchId: "batch-1",
      commandId: "command-1",
      reservationExpiresAt: "2026-07-13T10:00:15.000Z",
    });

    const acknowledged = await service.acknowledgeInvitation({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      participantId: participantIds.get("participant-1")!,
      commandId: "command-1",
      outcome: "SENT",
    });
    expect(
      acknowledged.participants[participantIds.get("participant-1")!]
        .invitation,
    ).toMatchObject({
      status: "SENT",
      source: "LOOTLOG_COMMAND",
      commandId: "command-1",
    });
    await expect(
      service.acknowledgeInvitation({
        notificationId: "room-1",
        organizerDiscordId: "organizer",
        participantId: participantIds.get("participant-1")!,
        commandId: "command-1",
        outcome: "SENT",
      }),
    ).resolves.toMatchObject({ revision: acknowledged.revision });
  });

  it("supersedes an older explicit reservation and rejects its stale acknowledgement", async () => {
    const repository = new InMemoryReadyRoomRepository();
    const generatedIds = [
      "room-1",
      "batch-1",
      "command-1",
      "batch-2",
      "command-2",
      "empty-batch",
    ];
    const service = new ReadyRoomService(
      repository,
      () => Date.parse("2026-07-13T10:00:00.000Z"),
      () => generatedIds.shift()!,
    );
    const character = {
      accountId: "account",
      characterId: "character",
      icon: "character.gif",
      lvl: 200,
      nick: "Character",
      prof: "w",
    };
    await service.create({
      organizerDiscordId: "organizer",
      organizerCharacter: character,
      guildIds: ["guild-1"],
      world: "Fobos",
    });
    await service.apply({
      notificationId: "room-1",
      participantDiscordId: "participant",
      character: {
        ...character,
        accountId: "participant-account",
        characterId: "participant-character",
      },
      world: "Fobos",
      accessibleGuildIds: ["guild-1"],
    });
    const participantId = await getParticipantId(
      repository,
      "room-1",
      "participant",
    );
    await service.accept({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      participantId,
      expectedRevision: 2,
    });

    const firstReservation = await service.reserveInvitations({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      targets: [{ participantId, applicationVersion: 1 }],
    });
    const secondReservation = await service.reserveInvitations({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      targets: [{ participantId, applicationVersion: 1 }],
    });

    expect(firstReservation.batch.reservations[0]?.commandId).toBe("command-1");
    expect(secondReservation.batch.reservations[0]?.commandId).toBe(
      "command-2",
    );
    await expect(
      service.acknowledgeInvitation({
        notificationId: "room-1",
        organizerDiscordId: "organizer",
        participantId,
        commandId: "command-1",
        outcome: "SENT",
      }),
    ).rejects.toMatchObject({ response: { code: "STALE_COMMAND" } });

    await expect(
      service.reserveInvitations({
        notificationId: "room-1",
        organizerDiscordId: "organizer",
        targets: [{ participantId, applicationVersion: 2 }],
      }),
    ).resolves.toMatchObject({
      batch: { batchId: "empty-batch", reservations: [] },
    });
  });

  it("stops invitation reservation CAS retries after four conflicts", async () => {
    const repository = new InMemoryReadyRoomRepository();
    const service = new ReadyRoomService(
      repository,
      () => Date.parse("2026-07-13T10:00:00.000Z"),
      () => "generated-id",
    );
    const character = {
      accountId: "account",
      characterId: "character",
      icon: "character.gif",
      lvl: 200,
      nick: "Character",
      prof: "w",
    };
    await service.create({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      organizerCharacter: character,
      guildIds: ["guild-1"],
      world: "Fobos",
    });
    await service.apply({
      notificationId: "room-1",
      participantDiscordId: "participant",
      character: {
        ...character,
        accountId: "participant-account",
        characterId: "participant-character",
      },
      world: "Fobos",
      accessibleGuildIds: ["guild-1"],
    });
    const participantId = await getParticipantId(
      repository,
      "room-1",
      "participant",
    );
    await service.accept({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      participantId,
      expectedRevision: 2,
    });
    let commitAttempts = 0;
    repository.commit = () => {
      commitAttempts += 1;
      return Promise.resolve({ status: "conflict" as const });
    };

    await expect(
      service.reserveInvitations({
        notificationId: "room-1",
        organizerDiscordId: "organizer",
        targets: [{ participantId, applicationVersion: 1 }],
      }),
    ).rejects.toMatchObject({ response: { code: "REVISION_CONFLICT" } });
    expect(commitAttempts).toBe(4);
  });

  it("reconciles expired reservations and supports explicit manual annotations", async () => {
    const repository = new InMemoryReadyRoomRepository();
    let currentTime = Date.parse("2026-07-13T10:00:00.000Z");
    const generatedIds = ["room-1", "batch-1", "command-1"];
    const service = new ReadyRoomService(
      repository,
      () => currentTime,
      () => generatedIds.shift()!,
    );
    const character = {
      accountId: "account",
      characterId: "character",
      icon: "character.gif",
      lvl: 200,
      nick: "Character",
      prof: "w",
    };
    await service.create({
      organizerDiscordId: "organizer",
      organizerCharacter: character,
      guildIds: ["guild-1"],
      world: "Fobos",
    });
    await service.apply({
      notificationId: "room-1",
      participantDiscordId: "participant",
      character: {
        ...character,
        accountId: "participant-account",
        characterId: "participant-character",
      },
      world: "Fobos",
      accessibleGuildIds: ["guild-1"],
    });
    const participantId = await getParticipantId(
      repository,
      "room-1",
      "participant",
    );
    await service.accept({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      participantId,
      expectedRevision: 2,
    });
    await service.reserveInvitations({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      targets: [{ participantId, applicationVersion: 1 }],
    });

    await expect(
      service.annotateInvitation({
        notificationId: "room-1",
        organizerDiscordId: "organizer",
        participantId,
        expectedRevision: 4,
        outcome: "SENT",
      }),
    ).rejects.toMatchObject({
      response: { code: "INVALID_STATE_TRANSITION" },
    });

    currentTime = Date.parse("2026-07-13T10:00:16.000Z");
    const reconciled = await service.reconcileInvitation({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      participantId,
      commandId: "command-1",
      expectedRevision: 4,
      outcome: "NOT_MARKED",
    });
    expect(reconciled.participants[participantId].invitation).toMatchObject({
      status: "NOT_MARKED",
      source: null,
      commandId: null,
      reservationExpiresAt: null,
    });

    const annotated = await service.annotateInvitation({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      participantId,
      expectedRevision: 5,
      outcome: "SENT",
    });
    expect(annotated.participants[participantId].invitation).toMatchObject({
      status: "SENT",
      source: "MANUAL_ANNOTATION",
      commandId: null,
      batchId: null,
      reservationExpiresAt: null,
    });
  });

  it("projects complete party snapshots without performing game actions", async () => {
    const repository = new InMemoryReadyRoomRepository();
    const service = new ReadyRoomService(
      repository,
      () => Date.parse("2026-07-13T10:00:00.000Z"),
      () => "room-1",
    );
    const character = {
      accountId: "account",
      characterId: "character",
      icon: "character.gif",
      lvl: 200,
      nick: "Character",
      prof: "w",
    };
    await service.create({
      organizerDiscordId: "organizer",
      organizerCharacter: character,
      guildIds: ["guild-1"],
      world: "Fobos",
    });
    const participantIds = new Map<string, string>();
    for (const participantDiscordId of ["participant-1", "participant-2"]) {
      await service.apply({
        notificationId: "room-1",
        participantDiscordId,
        character: {
          ...character,
          characterId: `character-${participantDiscordId}`,
        },
        world: "Fobos",
        accessibleGuildIds: ["guild-1"],
      });
      const aggregate = await repository.get("room-1");
      const participantId = await getParticipantId(
        repository,
        "room-1",
        participantDiscordId,
      );
      participantIds.set(participantDiscordId, participantId);
      await service.accept({
        notificationId: "room-1",
        organizerDiscordId: "organizer",
        participantId,
        expectedRevision: aggregate!.revision,
      });
    }

    const oneMember = await service.observeParty({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      memberCharacterIds: ["character-participant-1"],
    });
    expect(
      oneMember.participants[participantIds.get("participant-1")!]
        .partyPresence,
    ).toBe("IN_PARTY");
    expect(
      oneMember.participants[participantIds.get("participant-2")!]
        .partyPresence,
    ).toBe("OUTSIDE");

    const emptyParty = await service.observeParty({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      memberCharacterIds: [],
    });
    expect(
      emptyParty.participants[participantIds.get("participant-1")!]
        .partyPresence,
    ).toBe("OUTSIDE");
    expect(
      emptyParty.participants[participantIds.get("participant-2")!]
        .partyPresence,
    ).toBe("OUTSIDE");
  });

  it("stops participant-local CAS retries after four conflicts", async () => {
    const repository = new InMemoryReadyRoomRepository();
    const service = new ReadyRoomService(
      repository,
      () => Date.parse("2026-07-13T10:00:00.000Z"),
      () => "room-1",
    );
    const character = {
      accountId: "account",
      characterId: "character",
      icon: "character.gif",
      lvl: 200,
      nick: "Character",
      prof: "w",
    };
    await service.create({
      organizerDiscordId: "organizer",
      organizerCharacter: character,
      guildIds: ["guild-1"],
      world: "Fobos",
    });
    await service.apply({
      notificationId: "room-1",
      participantDiscordId: "participant",
      character: {
        ...character,
        accountId: "participant-account",
        characterId: "participant-character",
      },
      world: "Fobos",
      accessibleGuildIds: ["guild-1"],
    });
    const participantId = await getParticipantId(
      repository,
      "room-1",
      "participant",
    );
    await service.accept({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      participantId,
      expectedRevision: 2,
    });

    let commitAttempts = 0;
    repository.commit = () => {
      commitAttempts += 1;
      return Promise.resolve({ status: "conflict" as const });
    };

    await expect(
      service.observeParty({
        notificationId: "room-1",
        organizerDiscordId: "organizer",
        memberCharacterIds: ["participant-character"],
      }),
    ).rejects.toMatchObject({ response: { code: "REVISION_CONFLICT" } });
    expect(commitAttempts).toBe(4);
  });

  it("captures active recipients before close and releases organizer ownership", async () => {
    const repository = new InMemoryReadyRoomRepository();
    const generatedIds = ["room-1", "room-2"];
    const service = new ReadyRoomService(
      repository,
      () => Date.parse("2026-07-13T10:00:00.000Z"),
      () => generatedIds.shift()!,
    );
    const character = {
      accountId: "account",
      characterId: "character",
      icon: "character.gif",
      lvl: 200,
      nick: "Character",
      prof: "w",
    };
    await service.create({
      organizerDiscordId: "organizer",
      organizerCharacter: character,
      guildIds: ["guild-1"],
      world: "Fobos",
    });
    for (const participantDiscordId of ["applicant", "accepted"]) {
      await service.apply({
        notificationId: "room-1",
        participantDiscordId,
        character: {
          ...character,
          characterId: `character-${participantDiscordId}`,
        },
        world: "Fobos",
        accessibleGuildIds: ["guild-1"],
      });
    }
    await service.accept({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      participantId: await getParticipantId(repository, "room-1", "accepted"),
      expectedRevision: 3,
    });

    const closed = await service.close({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      expectedRevision: 4,
    });
    expect(closed.recipientDiscordIds).toEqual([
      "organizer",
      "applicant",
      "accepted",
    ]);
    expect(closed.projection).toMatchObject({ status: "CLOSED", revision: 5 });
    await expect(
      service.create({
        organizerDiscordId: "organizer",
        organizerCharacter: character,
        guildIds: ["guild-1"],
        world: "Fobos",
      }),
    ).resolves.toMatchObject({ notificationId: "room-2", status: "ACTIVE" });
  });
});
