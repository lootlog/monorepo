import {
  getFactionWarsControllerGetCurrentWarQueryKey,
  useFactionWarsControllerGetCurrentWar,
} from "@lootlog/client/main";
import { useSession } from "@/hooks/auth/use-session";

const CURRENT_WAR_STALE_TIME_MS = 10 * 60_000;

export const CURRENT_FACTION_WAR_QUERY_KEY =
  getFactionWarsControllerGetCurrentWarQueryKey();

/**
 * The war shown to the signed-in player, with their pick. Starting the game
 * costs one request; a 404 (no war defined) is an answer, not a failure.
 */
export const useCurrentFactionWar = () => {
  const { data: session } = useSession();

  return useFactionWarsControllerGetCurrentWar({
    query: {
      enabled: Boolean(session?.user),
      staleTime: CURRENT_WAR_STALE_TIME_MS,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  });
};
