import { Outlet, useParams } from "@tanstack/react-router";
import { useEventSocket } from "./hooks/socket/use-event-socket";

export const EventRouteLayout = () => {
  const { guildId, eventId } = useParams({ strict: false });

  useEventSocket({
    guildId,
    eventId,
  });

  return <Outlet />;
};
