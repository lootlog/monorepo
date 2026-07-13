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
              aggregate.participants[discordId]?.application === "APPLIED" ||
              aggregate.participants[discordId]?.application === "ACCEPTED"),
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
    participantDiscordId: string,
  ) {
    const acceptedRoomId = this.acceptedRooms.get(participantDiscordId);
    const result = this.commit(expected, next);
    return result.then((commitResult) => {
      if (
        commitResult.status === "committed" &&
        acceptedRoomId === expected.notificationId
      ) {
        this.acceptedRooms.delete(participantDiscordId);
      }
      return commitResult;
    });
  }

  terminate(
    expected: ReadyRoomAggregate,
    next: ReadyRoomAggregate,
    participantDiscordIds: string[],
  ) {
    const result = this.commit(expected, next);
    return result.then((commitResult) => {
      if (commitResult.status === "committed") {
        this.organizerRooms.delete(expected.organizerDiscordId);
        for (const participantDiscordId of participantDiscordIds) {
          if (
            this.acceptedRooms.get(participantDiscordId) ===
            expected.notificationId
          ) {
            this.acceptedRooms.delete(participantDiscordId);
          }
        }
      }
      return commitResult;
    });
  }

  saveApplication(
    expected: ReadyRoomAggregate,
    next: ReadyRoomAggregate,
    _participantDiscordId: string,
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
    participantDiscordId: string,
  ) {
    const acceptedRoomId = this.acceptedRooms.get(participantDiscordId);
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
    this.acceptedRooms.set(participantDiscordId, next.notificationId);
    return Promise.resolve({
      status: "committed" as const,
      aggregate: structuredClone(next),
    });
  }
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
      character,
      world: "Fobos",
      accessibleGuildIds: ["guild-1", "guild-2"],
    });
    await service.apply({
      notificationId: "room-2",
      participantDiscordId: "participant",
      character,
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
      participant: {
        discordId: "applicant",
        application: "APPLIED",
        readiness: "NOT_REQUESTED",
        invitation: { status: "NOT_MARKED" },
        partyPresence: "OUTSIDE",
      },
    });
    expect(projection).not.toHaveProperty("participants");
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

    const accepted = await service.accept({
      notificationId: "room-1",
      organizerDiscordId: "organizer-1",
      participantDiscordId: "applicant",
      expectedRevision: 2,
    });

    expect(accepted).toMatchObject({
      viewer: "ORGANIZER",
      revision: 3,
      participants: {
        applicant: { application: "ACCEPTED" },
      },
    });
    await expect(
      service.accept({
        notificationId: "room-2",
        organizerDiscordId: "organizer-2",
        participantDiscordId: "applicant",
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
      await service.accept({
        notificationId: "room-1",
        organizerDiscordId: "organizer",
        participantDiscordId,
        expectedRevision: current!.revision,
      });
    }

    const current = await repository.get("room-1");
    const started = await service.startReadyCheck({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      expectedRevision: current!.revision,
    });
    expect(started).toMatchObject({
      readyCheck: { roundId: 1 },
      participants: {
        "participant-1": { readiness: "PENDING" },
        "participant-2": { readiness: "PENDING" },
      },
    });

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
    const acceptedMidRound = await service.accept({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      participantDiscordId: "participant-3",
      expectedRevision: beforeMidRoundAccept!.revision,
    });
    expect(acceptedMidRound.participants["participant-3"]).toMatchObject({
      application: "ACCEPTED",
      readiness: "PENDING",
    });
    const removedMidRound = await service.remove({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      participantDiscordId: "participant-3",
      expectedRevision: acceptedMidRound.revision,
    });
    expect(removedMidRound.participants["participant-3"]).toMatchObject({
      application: "DECLINED",
      readiness: "NOT_REQUESTED",
    });

    await Promise.all([
      service.respondToReadyCheck({
        notificationId: "room-1",
        participantDiscordId: "participant-1",
        roundId: 1,
        ready: true,
      }),
      service.respondToReadyCheck({
        notificationId: "room-1",
        participantDiscordId: "participant-2",
        roundId: 1,
        ready: false,
      }),
    ]);
    await expect(repository.get("room-1")).resolves.toMatchObject({
      participants: {
        "participant-1": { readiness: "READY" },
        "participant-2": { readiness: "NOT_READY" },
      },
    });

    const afterResponses = await repository.get("room-1");
    const restarted = await service.startReadyCheck({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      expectedRevision: afterResponses!.revision,
    });
    expect(restarted).toMatchObject({
      readyCheck: { roundId: 2 },
      participants: {
        "participant-1": { readiness: "PENDING" },
        "participant-2": { readiness: "PENDING" },
      },
    });
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
    await service.accept({
      notificationId: "room-1",
      organizerDiscordId: "organizer-1",
      participantDiscordId: "participant",
      expectedRevision: 2,
    });

    const withdrawn = await service.withdraw({
      notificationId: "room-1",
      participantDiscordId: "participant",
    });
    expect(withdrawn).toMatchObject({
      participant: {
        application: "WITHDRAWN",
        readiness: "NOT_REQUESTED",
        invitation: { status: "NOT_MARKED" },
        partyPresence: "OUTSIDE",
      },
    });
    await expect(
      service.accept({
        notificationId: "room-2",
        organizerDiscordId: "organizer-2",
        participantDiscordId: "participant",
        expectedRevision: 2,
      }),
    ).resolves.toMatchObject({
      participants: { participant: { application: "ACCEPTED" } },
    });
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

    const declined = await service.decline({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      participantDiscordId: "declined",
      expectedRevision: 3,
    });
    expect(declined.participants.declined).toMatchObject({
      application: "DECLINED",
      readiness: "NOT_REQUESTED",
    });
    await service.accept({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      participantDiscordId: "removed",
      expectedRevision: 4,
    });
    const removed = await service.remove({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      participantDiscordId: "removed",
      expectedRevision: 5,
    });
    expect(removed.participants.removed).toMatchObject({
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
      await service.accept({
        notificationId: "room-1",
        organizerDiscordId: "organizer",
        participantDiscordId,
        expectedRevision: aggregate!.revision,
      });
    }

    const aggregate = await repository.get("room-1");
    const reservation = await service.reserveInvitations({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      participantDiscordIds: ["participant-1", "participant-2"],
      expectedRevision: aggregate!.revision,
    });
    expect(reservation.batch).toEqual({
      batchId: "batch-1",
      reservations: [
        {
          participantDiscordId: "participant-1",
          characterId: "character-participant-1",
          commandId: "command-1",
        },
        {
          participantDiscordId: "participant-2",
          characterId: "character-participant-2",
          commandId: "command-2",
        },
      ],
    });
    expect(
      reservation.projection.participants["participant-1"].invitation,
    ).toMatchObject({
      status: "COMMAND_RESERVED",
      batchId: "batch-1",
      commandId: "command-1",
      reservationExpiresAt: "2026-07-13T10:00:15.000Z",
    });

    const acknowledged = await service.acknowledgeInvitation({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      participantDiscordId: "participant-1",
      commandId: "command-1",
      outcome: "SENT",
    });
    expect(acknowledged.participants["participant-1"].invitation).toMatchObject(
      {
        status: "SENT",
        source: "LOOTLOG_COMMAND",
        commandId: "command-1",
      },
    );
    await expect(
      service.acknowledgeInvitation({
        notificationId: "room-1",
        organizerDiscordId: "organizer",
        participantDiscordId: "participant-1",
        commandId: "command-1",
        outcome: "SENT",
      }),
    ).resolves.toMatchObject({
      participants: {
        "participant-1": { invitation: { status: "SENT" } },
        "participant-2": { invitation: { status: "COMMAND_RESERVED" } },
      },
    });
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
      character,
      world: "Fobos",
      accessibleGuildIds: ["guild-1"],
    });
    await service.accept({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      participantDiscordId: "participant",
      expectedRevision: 2,
    });
    await service.reserveInvitations({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      participantDiscordIds: ["participant"],
      expectedRevision: 3,
    });

    await expect(
      service.annotateInvitation({
        notificationId: "room-1",
        organizerDiscordId: "organizer",
        participantDiscordId: "participant",
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
      participantDiscordId: "participant",
      commandId: "command-1",
      expectedRevision: 4,
      outcome: "NOT_MARKED",
    });
    expect(reconciled.participants.participant.invitation).toMatchObject({
      status: "NOT_MARKED",
      source: null,
      commandId: null,
      reservationExpiresAt: null,
    });

    const annotated = await service.annotateInvitation({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      participantDiscordId: "participant",
      expectedRevision: 5,
      outcome: "SENT",
    });
    expect(annotated.participants.participant.invitation).toMatchObject({
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
      await service.accept({
        notificationId: "room-1",
        organizerDiscordId: "organizer",
        participantDiscordId,
        expectedRevision: aggregate!.revision,
      });
    }

    const oneMember = await service.observeParty({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      memberCharacterIds: ["character-participant-1"],
    });
    expect(oneMember.participants).toMatchObject({
      "participant-1": { partyPresence: "IN_PARTY" },
      "participant-2": { partyPresence: "OUTSIDE" },
    });

    const emptyParty = await service.observeParty({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      memberCharacterIds: [],
    });
    expect(emptyParty.participants).toMatchObject({
      "participant-1": { partyPresence: "OUTSIDE" },
      "participant-2": { partyPresence: "OUTSIDE" },
    });
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
      character,
      world: "Fobos",
      accessibleGuildIds: ["guild-1"],
    });
    await service.accept({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      participantDiscordId: "participant",
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
        memberCharacterIds: ["character"],
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
      participantDiscordId: "accepted",
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
