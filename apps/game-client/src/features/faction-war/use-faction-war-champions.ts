import {
  getFactionWarsControllerGetChampionsQueryKey,
  useFactionWarsControllerGetChampions,
} from "@lootlog/client/main";
import { useSession } from "@/hooks/auth/use-session";
import { indexChampionFactions } from "./faction-war-champions";

/** Champions change when a war ends or a winner hides their highlight. */
const CHAMPIONS_REFRESH_MS = 30 * 60_000;

export const FACTION_WAR_CHAMPIONS_QUERY_KEY =
  getFactionWarsControllerGetChampionsQueryKey();

/** Champions of the last finished war, by Margonem character id. */
export const useFactionWarChampions = () => {
  const { data: session } = useSession();

  const query = useFactionWarsControllerGetChampions({
    query: {
      enabled: Boolean(session?.user),
      staleTime: CHAMPIONS_REFRESH_MS,
      refetchInterval: CHAMPIONS_REFRESH_MS,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  });

  return {
    warId: query.data?.warId ?? null,
    factions: indexChampionFactions(query.data),
  };
};
