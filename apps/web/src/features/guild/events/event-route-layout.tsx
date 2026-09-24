import { Outlet, useParams } from "@tanstack/react-router";
import { useUsersControllerGetCurrentUserAccessibleGuilds } from "@lootlog/client/main";
import { useEventSocket } from "./hooks/socket/use-event-socket";

export const EventRouteLayout = () => {
  const { guildId: routeGuildId, eventId } = useParams({ strict: false });
  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds();

  const guild = guilds?.find(
    (entry) => entry.id === routeGuildId || entry.vanityUrl === routeGuildId,
  );

  useEventSocket({
    guildId: guild?.id,
    routeGuildId,
    eventId,
  });

  return <Outlet />;
};
