import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  useUsersControllerGetCurrentUserAccessibleGuilds,
} from "@lootlog/client/main";
import { useSocket } from "@/contexts/socket-context";
import { summarizeRealtimeConnection } from "@/lib/realtime-connection-summary";

const ACCESSIBLE_GUILDS_STALE_TIME_MS = 5 * 60 * 1000;

/** The gateway state every connection indicator shows, with joined guild names resolved. */
export const useRealtimeConnection = () => {
  const { connected, joined, joinedGuilds } = useSocket();

  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds({
    query: {
      queryKey: getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
      refetchOnMount: false,
      staleTime: ACCESSIBLE_GUILDS_STALE_TIME_MS,
    },
  });

  const summary = summarizeRealtimeConnection({
    connected,
    joined,
    joinedGuilds,
  });

  const joinedGuildNames = joinedGuilds.map(
    (guildId) => guilds?.find((guild) => guild.id === guildId)?.name ?? guildId,
  );

  return { summary, isConnected: summary === "connected", joinedGuildNames };
};
