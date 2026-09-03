import { useUsersControllerGetCurrentUserGuilds } from "@lootlog/client/main";

type ReservationSourceOrganization = {
  calendarPath: string;
  iconUrl: string | null;
};

export function useReservationOrganizationIcon(
  sourceOrganization: ReservationSourceOrganization,
) {
  const { data: guilds } = useUsersControllerGetCurrentUserGuilds();
  const organizationPathSegment = sourceOrganization.calendarPath.split("/")[1];
  const currentGuild = guilds?.find(
    (guild) =>
      guild.id === organizationPathSegment ||
      guild.vanityUrl === organizationPathSegment,
  );

  return currentGuild?.icon ?? sourceOrganization.iconUrl;
}
