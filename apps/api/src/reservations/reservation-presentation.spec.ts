import { presentReservation } from "./reservation-presentation";

const guild = {
  id: "source-guild",
  name: "Source",
  icon: null,
  vanityUrl: "source",
  reservationMaxDurationMinutes: 180,
  reservationMinDurationMinutes: 30,
  reservationTimeGranularityMinutes: 15,
  reservationMaxAdvanceDays: 7,
};

const reservation = {
  id: 1,
  guildId: guild.id,
  spotId: "driady",
  spotName: "Driady",
  startsAt: new Date("2026-08-26T12:00:00.000Z"),
  endsAt: new Date("2026-08-26T13:00:00.000Z"),
  createdByUserId: "owner-user",
  authorDisplayName: "Owner",
  authorAvatarUrl: null,
  reminderMinutesBefore: null,
  comment: null,
  createdAt: new Date("2026-08-26T11:00:00.000Z"),
  guild,
};

describe("presentReservation", () => {
  it("redacts source policy settings from another user's partner reservation", () => {
    const result = presentReservation(reservation as never, {
      guildId: "viewer-guild",
      userId: "viewer-user",
      discordId: "viewer-discord",
      canModerateCurrentGuild: true,
    });

    expect(result.editingConstraints).toBeNull();
  });

  it("keeps policy settings for a reservation in the current organization", () => {
    const result = presentReservation(reservation as never, {
      guildId: guild.id,
      userId: "viewer-user",
      discordId: "viewer-discord",
      canModerateCurrentGuild: false,
    });

    expect(result.editingConstraints).toEqual({
      reservationMaxDurationMinutes: 180,
      reservationMinDurationMinutes: 30,
      reservationTimeGranularityMinutes: 15,
      reservationMaxAdvanceDays: 7,
    });
  });

  it("keeps policy settings when the owner views a personal partner reservation", () => {
    const result = presentReservation(reservation as never, {
      guildId: null,
      userId: "owner-user",
      discordId: "owner-discord",
      canModerateCurrentGuild: false,
    });

    expect(result.editingConstraints).not.toBeNull();
    expect(result.canEdit).toBe(true);
  });

  it("does not expose source policy or edit eligibility to a historical owner through a partner calendar", () => {
    const result = presentReservation(reservation as never, {
      guildId: "viewer-guild",
      userId: "owner-user",
      discordId: "owner-discord",
      canModerateCurrentGuild: false,
    });

    expect(result.isMine).toBe(true);
    expect(result.canEdit).toBe(false);
    expect(result.editingConstraints).toBeNull();
  });
});
