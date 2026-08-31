import type { Guild, Reservation } from "#src/db/domain";

export type ReservationWithGuild = Reservation & {
  guild: Pick<
    Guild,
    | "id"
    | "name"
    | "icon"
    | "vanityUrl"
    | "reservationMaxDurationMinutes"
    | "reservationMinDurationMinutes"
    | "reservationTimeGranularityMinutes"
    | "reservationMaxAdvanceDays"
  >;
};

export function getGuildIconUrl(
  guild: Pick<Guild, "id" | "icon">,
): string | null {
  if (!guild.icon) {
    return null;
  }

  const extension = guild.icon.startsWith("a_") ? "gif" : "webp";
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${extension}?size=128`;
}

export function getDiscordAvatarUrl(
  discordId: string,
  avatar: string | null,
): string | null {
  if (!avatar) {
    return null;
  }

  const extension = avatar.startsWith("a_") ? "gif" : "webp";
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.${extension}?size=128`;
}

export function presentReservation(
  reservation: ReservationWithGuild,
  viewer: {
    guildId: string | null;
    userId: string;
    discordId: string;
    canModerateCurrentGuild: boolean;
  },
) {
  const isMine =
    reservation.createdByUserId === viewer.userId ||
    reservation.createdBy === viewer.discordId;
  const sourceIsCurrent = reservation.guildId === viewer.guildId;
  const canEdit = isMine && (sourceIsCurrent || viewer.guildId === null);

  return {
    id: reservation.id,
    spotId: reservation.spotId,
    spotName: reservation.spotName,
    startsAt: reservation.startsAt,
    endsAt: reservation.endsAt,
    comment: reservation.comment,
    createdAt: reservation.createdAt,
    author: {
      displayName: reservation.authorDisplayName,
      avatarUrl: reservation.authorAvatarUrl,
    },
    sourceOrganization: {
      name: reservation.guild.name,
      iconUrl: getGuildIconUrl(reservation.guild),
      isCurrent: sourceIsCurrent,
      calendarPath: `/${reservation.guild.vanityUrl ?? reservation.guild.id}/reservations/${reservation.spotId}`,
    },
    isMine,
    canEdit,
    canCancel: isMine || (sourceIsCurrent && viewer.canModerateCurrentGuild),
    editingConstraints:
      sourceIsCurrent || canEdit
        ? {
            reservationMaxDurationMinutes:
              reservation.guild.reservationMaxDurationMinutes,
            reservationMinDurationMinutes:
              reservation.guild.reservationMinDurationMinutes,
            reservationTimeGranularityMinutes:
              reservation.guild.reservationTimeGranularityMinutes,
            reservationMaxAdvanceDays:
              reservation.guild.reservationMaxAdvanceDays,
          }
        : null,
    reminderMinutesBefore: isMine
      ? presentReminderMinutes(reservation.reminderMinutesBefore)
      : null,
  };
}

function presentReminderMinutes(value: number | null) {
  switch (value) {
    case 0:
    case 5:
    case 15:
    case 30:
      return value;
    default:
      return null;
  }
}
