import type {
  PartyReadyRoomParticipant,
  PartyReadyRoomProjection,
} from "@lootlog/types";
import { beforeEach, describe, expect, it } from "vitest";
import {
  captureReadyRoomSyncBaseline,
  selectOwnedReadyRoom,
  selectReadyRoomForCharacter,
  selectReadyRoomParticipantForCharacter,
  usePartyFinderStore,
} from "@/store/party-finder.store";

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

describe("party-finder Ready Room store", () => {
  beforeEach(() => {
    usePartyFinderStore.getState().clearReadyRooms();
  });

  it("does not let an older REST snapshot replace a newer socket projection", () => {
    usePartyFinderStore.getState().mergeProjection(createProjection(5));
    usePartyFinderStore.getState().mergeProjection(createProjection(4));

    expect(usePartyFinderStore.getState().projections["room-1"]?.revision).toBe(
      5,
    );
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
    usePartyFinderStore.getState().mergeProjection(projection);

    expect(
      selectReadyRoomParticipantForCharacter(projection, participantIdentity)
        ?.participantId,
    ).toBe("participant-matching");
    expect(
      selectReadyRoomForCharacter(
        usePartyFinderStore.getState(),
        participantIdentity,
      )?.notificationId,
    ).toBe("room-1");
  });

  it("keeps organizer projection precedence at the same revision", () => {
    const participantProjection = createProjection(2);
    const organizerProjection: PartyReadyRoomProjection = {
      ...participantProjection,
      viewer: "ORGANIZER",
      ownedParticipantIds: [],
    };

    usePartyFinderStore
      .getState()
      .mergeProjections([participantProjection, organizerProjection]);
    usePartyFinderStore.getState().mergeProjection(participantProjection);

    expect(
      selectOwnedReadyRoom(usePartyFinderStore.getState())?.notificationId,
    ).toBe("room-1");
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

    usePartyFinderStore
      .getState()
      .mergeProjections([ownedReadyRoom, participantReadyRoom]);

    expect(
      selectReadyRoomForCharacter(
        usePartyFinderStore.getState(),
        participantIdentity,
      )?.notificationId,
    ).toBe("room-2");
    expect(
      selectReadyRoomForCharacter(usePartyFinderStore.getState(), {
        accountId: "organizer-account",
        characterId: "organizer-character",
      })?.notificationId,
    ).toBe("room-1");
  });

  it("does not delete a newer socket update after an authoritative REST absence", () => {
    usePartyFinderStore.getState().mergeProjection(createProjection(2));
    const baseline = captureReadyRoomSyncBaseline(
      usePartyFinderStore.getState(),
    );

    usePartyFinderStore.getState().mergeProjection(createProjection(3));
    usePartyFinderStore.getState().applyAuthoritativeSync([], baseline);

    expect(usePartyFinderStore.getState()).toMatchObject({
      readyRoomsSynchronized: true,
      projections: { "room-1": { revision: 3 } },
    });
  });

  it("records an authoritative absence as a removal watermark", () => {
    usePartyFinderStore.getState().mergeProjection(createProjection(2));
    const baseline = captureReadyRoomSyncBaseline(
      usePartyFinderStore.getState(),
    );

    usePartyFinderStore.getState().applyAuthoritativeSync([], baseline);
    usePartyFinderStore.getState().mergeProjection(createProjection(2));

    expect(usePartyFinderStore.getState()).toMatchObject({
      projections: {},
      roomVersions: {
        "room-1": { revision: 2, presence: "REMOVED" },
      },
    });
  });

  it("lets REMOVE win at an equal revision and accepts a later UPSERT", () => {
    usePartyFinderStore.getState().mergeProjection(createProjection(2));
    usePartyFinderStore.getState().applyUpdate({
      schemaVersion: 3,
      type: "REMOVE",
      notificationId: "room-1",
      revision: 2,
    });
    usePartyFinderStore.getState().mergeProjection(createProjection(2));

    expect(usePartyFinderStore.getState().projections).toEqual({});

    usePartyFinderStore.getState().applyUpdate({
      schemaVersion: 3,
      type: "UPSERT",
      projection: createProjection(3),
    });

    expect(usePartyFinderStore.getState().projections["room-1"]?.revision).toBe(
      3,
    );
  });
});
