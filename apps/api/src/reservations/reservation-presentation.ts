import type {
  guildTable,
  reservationTable,
} from "#src/database/drizzle/schema";

type Guild = typeof guildTable.$inferSelect;
type Reservation = typeof reservationTable.$inferSelect;

type DiscordGuildIcon =
  | { readonly kind: "hash"; readonly value: string }
  | { readonly kind: "cdn-url"; readonly value: string };

const parseDiscordGuildIcon = (
  guildId: string,
  storedIcon: string | null,
): DiscordGuildIcon | null => {
  if (!storedIcon) return null;
  if (!storedIcon.startsWith("https://")) {
    return { kind: "hash", value: storedIcon };
  }
  try {
    const url = new URL(storedIcon);
    const isDiscordCdn = url.hostname === "cdn.discordapp.com";
    const belongsToGuild = url.pathname.startsWith(`/icons/${guildId}/`);
    return isDiscordCdn && belongsToGuild
      ? { kind: "cdn-url", value: url.toString() }
      : null;
  } catch {
    return null;
  }
};

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
  const icon = parseDiscordGuildIcon(guild.id, guild.icon);
  if (!icon) return null;
  if (icon.kind === "cdn-url") return icon.value;

  const extension = icon.value.startsWith("a_") ? "gif" : "webp";
  return `https://cdn.discordapp.com/icons/${guild.id}/${icon.value}.${extension}?size=128`;
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
    reservation.legacyCreatedByDiscordId === viewer.discordId;
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
