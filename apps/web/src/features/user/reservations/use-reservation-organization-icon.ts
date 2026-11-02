import { useUsersControllerGetCurrentUserGuilds } from "@lootlog/client/main";
import { findGuildByRouteId } from "@/lib/current-user-guilds";

type ReservationSourceOrganization = {
  calendarPath: string;
  iconUrl: string | null;
};

export function useReservationOrganizationIcon(
  sourceOrganization: ReservationSourceOrganization,
) {
  const { data: guilds } = useUsersControllerGetCurrentUserGuilds();
  const organizationPathSegment = sourceOrganization.calendarPath.split("/")[1];

  const currentGuild = findGuildByRouteId(guilds, organizationPathSegment);

  return currentGuild?.icon ?? sourceOrganization.iconUrl;
}
