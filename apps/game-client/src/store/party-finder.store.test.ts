import { beforeEach, describe, expect, it } from "vitest";
import type { PartyReadyRoomProjection } from "@lootlog/types";
import {
  selectAcceptedReadyRoomId,
  selectOwnedReadyRoom,
  selectPendingReadyRoomIds,
  usePartyFinderStore,
} from "@/store/party-finder.store";

function createProjection(
  revision: number,
  application: "APPLIED" | "ACCEPTED" = "APPLIED",
): PartyReadyRoomProjection {
  return {
    notificationId: "room-1",
    organizerDiscordId: "organizer",
    organizerCharacter: {
      accountId: "account",
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
    participant: {
      discordId: "participant",
      character: {
        accountId: "participant-account",
        characterId: "participant-character",
        icon: "participant.gif",
        lvl: 190,
        nick: "Participant",
        prof: "m",
      },
      application,
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
    },
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
    expect(selectPendingReadyRoomIds(usePartyFinderStore.getState())).toEqual([
      "room-1",
    ]);
  });

  it("derives owned, pending and accepted rooms from private projections", () => {
    const participantProjection = createProjection(2, "ACCEPTED");
    const organizerProjection: PartyReadyRoomProjection = {
      ...participantProjection,
      notificationId: "owned-room",
      viewer: "ORGANIZER",
      participants: {},
    };
    delete (organizerProjection as { participant?: unknown }).participant;

    usePartyFinderStore
      .getState()
      .mergeProjections([participantProjection, organizerProjection]);

    expect(selectAcceptedReadyRoomId(usePartyFinderStore.getState())).toBe(
      "room-1",
    );
    expect(
      selectOwnedReadyRoom(usePartyFinderStore.getState())?.notificationId,
    ).toBe("owned-room");
    expect(selectPendingReadyRoomIds(usePartyFinderStore.getState())).toEqual(
      [],
    );
  });
});
