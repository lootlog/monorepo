import type {
  PartyReadyRoomParticipant,
  PartyReadyRoomProjection,
} from "@lootlog/types";
import { beforeEach, describe, expect, it } from "vitest";
import {
  captureReadyRoomSyncBaseline,
  selectAcceptedReadyRoomId,
  selectOwnedReadyRoom,
  selectPendingReadyRoomIds,
  selectReadyRoomForCharacter,
  selectReadyRoomParticipantForCharacter,
  usePartyFinderStore,
} from "@/store/party-finder.store";

const identity = {
  accountId: "participant-account",
  characterId: "participant-character",
};

function createParticipant(
  overrides: Partial<PartyReadyRoomParticipant> = {},
): PartyReadyRoomParticipant {
  return {
    participantId: "participant-1",
    applicationVersion: 1,
    discordId: "participant",
    character: {
      accountId: identity.accountId,
      characterId: identity.characterId,
      icon: "participant.gif",
      lvl: 190,
      nick: "Participant",
      prof: "m",
    },
    application: "APPLIED",
    readiness: "NOT_REQUESTED",
    invitation: {
      status: "NOT_MARKED",
      source: null,
      commandId: null,
      batchId: null,
      reservationExpiresAt: null,
      updatedAt: "2026-07-13T10:01:00.000Z",
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
    schemaVersion: 2,
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
    readyCheck: null,
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
    expect(
      selectPendingReadyRoomIds(usePartyFinderStore.getState(), identity),
    ).toEqual(["room-1"]);
  });

  it("selects the entry matching the active account and character", () => {
    const acceptedParticipant = createParticipant({
      participantId: "participant-accepted",
      application: "ACCEPTED",
    });
    const otherParticipant = createParticipant({
      participantId: "participant-other",
      character: {
        ...createParticipant().character,
        characterId: "other-character",
      },
    });
    const projection = createProjection(2, acceptedParticipant);
    projection.participants[otherParticipant.participantId] = otherParticipant;
    usePartyFinderStore.getState().mergeProjection(projection);

    expect(
      selectReadyRoomParticipantForCharacter(projection, identity)
        ?.participantId,
    ).toBe("participant-accepted");
    expect(
      selectAcceptedReadyRoomId(usePartyFinderStore.getState(), identity),
    ).toBe("room-1");
    expect(
      selectPendingReadyRoomIds(usePartyFinderStore.getState(), identity),
    ).toEqual([]);
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

  it("prioritizes the active character room over a room owned by the same Discord user", () => {
    const ownedReadyRoom: PartyReadyRoomProjection = {
      ...createProjection(2),
      viewer: "ORGANIZER",
      ownedParticipantIds: [],
    };
    const acceptedReadyRoom: PartyReadyRoomProjection = {
      ...createProjection(
        2,
        createParticipant({
          participantId: "participant-accepted",
          application: "ACCEPTED",
        }),
      ),
      notificationId: "room-2",
    };

    usePartyFinderStore
      .getState()
      .mergeProjections([ownedReadyRoom, acceptedReadyRoom]);

    expect(
      selectReadyRoomForCharacter(usePartyFinderStore.getState(), identity)
        ?.notificationId,
    ).toBe("room-2");
    expect(
      selectReadyRoomForCharacter(usePartyFinderStore.getState(), {
        accountId: "organizer-account",
        characterId: "organizer-character",
      })?.notificationId,
    ).toBe("room-1");
  });

  it("applies an authoritative v2 snapshot without deleting newer socket state", () => {
    const baselineProjection = createProjection(2);
    usePartyFinderStore.getState().mergeProjection(baselineProjection);
    const baseline = captureReadyRoomSyncBaseline(
      usePartyFinderStore.getState(),
    );

    usePartyFinderStore
      .getState()
      .mergeProjection(createProjection(3, createParticipant()));
    usePartyFinderStore.getState().applyAuthoritativeSync([], baseline);

    expect(usePartyFinderStore.getState()).toMatchObject({
      readyRoomsSynchronized: true,
      projections: { "room-1": { revision: 3 } },
    });
  });

  it("removes unchanged baseline rooms absent from the authoritative response", () => {
    usePartyFinderStore.getState().mergeProjection(createProjection(2));
    const baseline = captureReadyRoomSyncBaseline(
      usePartyFinderStore.getState(),
    );

    usePartyFinderStore.getState().applyAuthoritativeSync([], baseline);

    expect(usePartyFinderStore.getState().projections).toEqual({});
  });
});
