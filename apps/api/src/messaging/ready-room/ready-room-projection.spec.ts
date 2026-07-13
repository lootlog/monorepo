import { describe, expect, it } from "vitest";
import {
  createReadyRoomProjection,
  getReadyRoomActiveRecipientDiscordIds,
} from "src/messaging/ready-room/ready-room-projection";
import type { ReadyRoomAggregate } from "src/messaging/ready-room/ready-room.types";

const aggregate: ReadyRoomAggregate = {
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
  revision: 3,
  createdAt: "2026-07-13T10:00:00.000Z",
  updatedAt: "2026-07-13T10:02:00.000Z",
  expiresAt: "2026-07-13T10:30:00.000Z",
  readyCheck: null,
  participants: {
    applicant: {
      discordId: "applicant",
      character: {
        accountId: "account-applicant",
        characterId: "character-applicant",
        icon: "applicant.gif",
        lvl: 180,
        nick: "Applicant",
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
    },
    accepted: {
      discordId: "accepted",
      character: {
        accountId: "account-accepted",
        characterId: "character-accepted",
        icon: "accepted.gif",
        lvl: 190,
        nick: "Accepted",
        prof: "p",
      },
      application: "ACCEPTED",
      readiness: "READY",
      invitation: {
        status: "SENT",
        source: "MANUAL_ANNOTATION",
        commandId: null,
        batchId: null,
        reservationExpiresAt: null,
        updatedAt: "2026-07-13T10:02:00.000Z",
      },
      partyPresence: "OUTSIDE",
      createdAt: "2026-07-13T10:01:00.000Z",
      updatedAt: "2026-07-13T10:02:00.000Z",
    },
  },
};

describe("createReadyRoomProjection", () => {
  it("shows every participant to the organizer and only self to a participant", () => {
    const organizerProjection = createReadyRoomProjection(
      aggregate,
      "organizer",
    );
    const participantProjection = createReadyRoomProjection(
      aggregate,
      "accepted",
    );

    expect(organizerProjection).toMatchObject({
      viewer: "ORGANIZER",
      participants: {
        applicant: { discordId: "applicant" },
        accepted: { discordId: "accepted" },
      },
    });
    expect(participantProjection).toMatchObject({
      viewer: "PARTICIPANT",
      participant: { discordId: "accepted" },
    });
    expect(participantProjection).not.toHaveProperty("participants");
  });

  it("selects only the organizer and active participants for updates", () => {
    const aggregateWithInactiveParticipants: ReadyRoomAggregate = {
      ...aggregate,
      participants: {
        ...aggregate.participants,
        declined: {
          ...aggregate.participants.applicant,
          discordId: "declined",
          application: "DECLINED",
        },
        withdrawn: {
          ...aggregate.participants.applicant,
          discordId: "withdrawn",
          application: "WITHDRAWN",
        },
      },
    };

    expect(
      getReadyRoomActiveRecipientDiscordIds(aggregateWithInactiveParticipants),
    ).toEqual(["organizer", "applicant", "accepted"]);
  });
});
