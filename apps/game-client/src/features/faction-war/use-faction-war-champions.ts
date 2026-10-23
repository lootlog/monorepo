import {
  getFactionWarsControllerGetChampionsQueryKey,
  useFactionWarsControllerGetChampions,
} from "@lootlog/client/main";
import { useSession } from "@/hooks/auth/use-session";
import { useGameStore } from "@/store/game.store";
import { indexChampionFactions } from "./faction-war-champions";

/** Champions change when a war ends or a winner hides their highlight. */
const CHAMPIONS_REFRESH_MS = 30 * 60_000;

/** Prefix of every world's champions query, for invalidation. */
export const FACTION_WAR_CHAMPIONS_QUERY_KEY =
  getFactionWarsControllerGetChampionsQueryKey();

/**
 * Champions of the last finished war on the world the game runs on, by
 * Margonem character id. Nothing is asked before the game names its world.
 */
export const useFactionWarChampions = () => {
  const { data: session } = useSession();
  const world = useGameStore((state) => state.game?.world);

  const query = useFactionWarsControllerGetChampions(
    { world: world ?? "" },
    {
      query: {
        enabled: Boolean(session?.user && world),
        staleTime: CHAMPIONS_REFRESH_MS,
        refetchInterval: CHAMPIONS_REFRESH_MS,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  );

  return {
    warId: query.data?.warId ?? null,
    factions: indexChampionFactions(query.data),
  };
};
