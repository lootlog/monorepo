import { describe, expect, it } from "vitest";
import {
  createReadyRoomProjection,
  getReadyRoomActiveRecipientDiscordIds,
} from "src/messaging/ready-room/ready-room-projection";
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
  revision: 3,
  createdAt: "2026-07-13T10:00:00.000Z",
  updatedAt: "2026-07-13T10:02:00.000Z",
  expiresAt: "2026-07-13T10:30:00.000Z",
  readyCheck: null,
  participants: {
    applicant: {
      participantId: "applicant",
      applicationVersion: 1,
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
      participantId: "accepted",
      applicationVersion: 1,
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
      participants: {
        accepted: { discordId: "accepted" },
      },
    });
    expect(participantProjection).not.toHaveProperty("ownedParticipantIds");
  });

  it("selects only the organizer and active participants for updates", () => {
    const aggregateWithInactiveParticipants: ReadyRoomAggregate = {
      ...aggregate,
      participants: {
        ...aggregate.participants,
        declined: {
          ...aggregate.participants.applicant,
          participantId: "declined",
          discordId: "declined",
          application: "DECLINED",
        },
        withdrawn: {
          ...aggregate.participants.applicant,
          participantId: "withdrawn",
          discordId: "withdrawn",
          application: "WITHDRAWN",
        },
      },
    };

    expect(
      getReadyRoomActiveRecipientDiscordIds(aggregateWithInactiveParticipants),
    ).toEqual(["organizer", "applicant", "accepted"]);
  });

  it("deduplicates recipients and exposes every entry owned by one participant", () => {
    const aggregateWithSharedOwner: ReadyRoomAggregate = {
      ...aggregate,
      participants: {
        first: {
          ...aggregate.participants.applicant,
          participantId: "first",
          discordId: "shared",
        },
        second: {
          ...aggregate.participants.accepted,
          participantId: "second",
          discordId: "shared",
        },
      },
    };

    expect(
      createReadyRoomProjection(aggregateWithSharedOwner, "shared"),
    ).toMatchObject({
      viewer: "PARTICIPANT",
      participants: {
        first: { participantId: "first" },
        second: { participantId: "second" },
      },
    });
    expect(
      getReadyRoomActiveRecipientDiscordIds(aggregateWithSharedOwner),
    ).toEqual(["organizer", "shared"]);
  });
});
