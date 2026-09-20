import type {
  PartyReadyRoomParticipant,
  PartyReadyRoomProjection,
} from "@lootlog/schema/party-ready-room";
import { describe, expect, it, vi } from "vitest";
import {
  applyAuthoritativeReadyRoomSync,
  applyReadyRoomUpdate,
  captureReadyRoomSyncBaseline,
  EMPTY_READY_ROOM_CACHE,
  mergeReadyRoomProjection,
  mergeReadyRoomProjections,
  selectOwnedReadyRoom,
  selectReadyRoomForCharacter,
  selectReadyRoomParticipantForCharacter,
} from "@/features/party-finder/ready-room-cache";

const participantIdentity = {
  accountId: "participant-account",
  characterId: "participant-character",
};

function createParticipant(
  overrides: Partial<PartyReadyRoomParticipant> = {},
): PartyReadyRoomParticipant {
  return {
    participantId: "participant-1",
    discordId: "participant",
    character: {
      accountId: participantIdentity.accountId,
      characterId: participantIdentity.characterId,
      icon: "participant.gif",
      lvl: 190,
      nick: "Participant",
      prof: "m",
    },
    partyPresence: "OUTSIDE",
    createdAt: "2026-07-13T10:01:00.000Z",
    updatedAt: "2026-07-13T10:01:00.000Z",
    ...overrides,
  };
}

function createProjection(
  revision: number,
  participant = createParticipant(),
): PartyReadyRoomProjection {
  return {
    schemaVersion: 3,
    notificationId: "room-1",
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
    status: "ACTIVE",
    revision,
    createdAt: "2026-07-13T10:00:00.000Z",
    updatedAt: "2026-07-13T10:01:00.000Z",
    expiresAt: "2026-07-13T10:30:00.000Z",
    viewer: "PARTICIPANT",
    participants: { [participant.participantId]: participant },
  };
}

describe("Ready Room cache", () => {
  it("does not let an older REST snapshot replace a newer socket projection", () => {
    const cache = mergeReadyRoomProjection(
      mergeReadyRoomProjection(EMPTY_READY_ROOM_CACHE, createProjection(5)),
      createProjection(4),
    );

    expect(cache.projections["room-1"]?.revision).toBe(5);
  });

  it("selects the participant entry matching the active account and character", () => {
    const matchingParticipant = createParticipant({
      participantId: "participant-matching",
    });

    const otherParticipant = createParticipant({
      participantId: "participant-other",
      character: {
        ...createParticipant().character,
        characterId: "other-character",
      },
    });

    const projection = createProjection(2, matchingParticipant);
    projection.participants[otherParticipant.participantId] = otherParticipant;
    const cache = mergeReadyRoomProjection(EMPTY_READY_ROOM_CACHE, projection);

    expect(
      selectReadyRoomParticipantForCharacter(projection, participantIdentity)
        ?.participantId,
    ).toBe("participant-matching");
    expect(
      selectReadyRoomForCharacter(cache, participantIdentity)?.notificationId,
    ).toBe("room-1");
  });

  it("keeps organizer projection precedence at the same revision", () => {
    const participantProjection = createProjection(2);

    const organizerProjection: PartyReadyRoomProjection = {
      ...participantProjection,
      viewer: "ORGANIZER",
      ownedParticipantIds: [],
    };

    const cache = mergeReadyRoomProjection(
      mergeReadyRoomProjections(EMPTY_READY_ROOM_CACHE, [
        participantProjection,
        organizerProjection,
      ]),
      participantProjection,
    );

    expect(selectOwnedReadyRoom(cache)?.notificationId).toBe("room-1");
  });

  it("uses the active character role when one Discord user has multiple accounts", () => {
    const ownedReadyRoom: PartyReadyRoomProjection = {
      ...createProjection(2),
      viewer: "ORGANIZER",
      ownedParticipantIds: [],
    };

    const participantReadyRoom: PartyReadyRoomProjection = {
      ...createProjection(2),
      notificationId: "room-2",
    };

    const cache = mergeReadyRoomProjections(EMPTY_READY_ROOM_CACHE, [
      ownedReadyRoom,
      participantReadyRoom,
    ]);

    expect(
      selectReadyRoomForCharacter(cache, participantIdentity)?.notificationId,
    ).toBe("room-2");
    expect(
      selectReadyRoomForCharacter(cache, {
        accountId: "organizer-account",
        characterId: "organizer-character",
      })?.notificationId,
    ).toBe("room-1");
  });

  it("does not delete a newer socket update after an authoritative REST absence", () => {
    const synchronized = mergeReadyRoomProjection(
      EMPTY_READY_ROOM_CACHE,
      createProjection(2),
    );

    const baseline = captureReadyRoomSyncBaseline(synchronized);

    const cache = applyAuthoritativeReadyRoomSync(
      mergeReadyRoomProjection(synchronized, createProjection(3)),
      [],
      baseline,
    );

    expect(cache).toMatchObject({
      projections: { "room-1": { revision: 3 } },
    });
  });

  it("records an authoritative absence as a removal watermark", () => {
    const synchronized = mergeReadyRoomProjection(
      EMPTY_READY_ROOM_CACHE,
      createProjection(2),
    );

    const baseline = captureReadyRoomSyncBaseline(synchronized);

    const cache = mergeReadyRoomProjection(
      applyAuthoritativeReadyRoomSync(synchronized, [], baseline),
      createProjection(2),
    );

    expect(cache).toMatchObject({
      projections: {},
      roomVersions: {
        "room-1": { revision: 2, presence: "REMOVED" },
      },
    });
  });

  it("lets REMOVE win at an equal revision and accepts a later UPSERT", () => {
    const removed = mergeReadyRoomProjection(
      applyReadyRoomUpdate(
        mergeReadyRoomProjection(EMPTY_READY_ROOM_CACHE, createProjection(2)),
        {
          schemaVersion: 3,
          type: "REMOVE",
          notificationId: "room-1",
          revision: 2,
        },
      ),
      createProjection(2),
    );

    expect(removed.projections).toEqual({});

    const reopened = applyReadyRoomUpdate(removed, {
      schemaVersion: 3,
      type: "UPSERT",
      projection: createProjection(3),
    });

    expect(reopened.projections["room-1"]?.revision).toBe(3);
  });

  it("allows an equal revision after the removal watermark expires", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    try {
      const removed = mergeReadyRoomProjection(
        applyReadyRoomUpdate(
          mergeReadyRoomProjection(EMPTY_READY_ROOM_CACHE, createProjection(2)),
          {
            schemaVersion: 3,
            type: "REMOVE",
            notificationId: "room-1",
            revision: 2,
          },
        ),
        createProjection(2),
      );

      expect(removed.projections).toEqual({});

      vi.advanceTimersByTime(120_001);

      expect(
        mergeReadyRoomProjection(removed, createProjection(2)).projections[
          "room-1"
        ]?.revision,
      ).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps only the newest 512 removal watermarks", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    try {
      let cache = EMPTY_READY_ROOM_CACHE;

      for (let index = 0; index < 513; index += 1) {
        cache = applyReadyRoomUpdate(cache, {
          schemaVersion: 3,
          type: "REMOVE",
          notificationId: `room-${index}`,
          revision: index,
        });
      }

      expect(Object.keys(cache.roomVersions)).toHaveLength(512);
      expect(cache.roomVersions["room-0"]).toBeUndefined();
      expect(cache.roomVersions["room-512"]).toMatchObject({
        presence: "REMOVED",
        revision: 512,
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
