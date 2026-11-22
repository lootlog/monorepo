import { useUsersControllerGetCurrentUserAccessibleGuilds } from "@lootlog/client/main";
import { useGateway } from "@/hooks/utils/use-gateway";
import { useTimersSocket } from "./use-timers-socket";

export const TimersSocketSubscription = () => {
  const { socket } = useGateway();
  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds();

  useTimersSocket({ socket, guilds });

  return null;
};
