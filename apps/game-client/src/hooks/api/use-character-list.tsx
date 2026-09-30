import {
  CHARACTER_LIST_CACHE_FRESH_TTL_MS,
  CHARACTER_LIST_CACHE_STALE_TTL_MS,
  fetchCharacterList,
} from "@/api";
import { useGameStore } from "@/store/game.store";
import { useQuery } from "@tanstack/react-query";
import type { GameVersion } from "@lootlog/schema/game-version";

const getCharacterListQueryKey = (
  accountId: number,
  world: string | undefined,
  gameVersion: GameVersion | null,
) => ["characters-v2", accountId, world, gameVersion] as const;

export const useCharacterList = () => {
  const accountId = useGameStore((state) =>
    Number(state.game?.hero.accountId ?? 0),
  );

  const world = useGameStore((state) => state.game?.world);
  const gameReady = useGameStore((state) => state.game !== null);
  const gameVersion = useGameStore((state) => state.game?.gameVersion ?? null);

  const query = useQuery({
    enabled: gameReady,
    queryKey: getCharacterListQueryKey(accountId, world, gameVersion),
    queryFn: () => fetchCharacterList({ accountId, world, gameVersion }),
    gcTime: CHARACTER_LIST_CACHE_STALE_TTL_MS,
    retry: false,
    staleTime: CHARACTER_LIST_CACHE_FRESH_TTL_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return query;
};
