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
}

describe("ReadyRoomService", () => {
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
});
