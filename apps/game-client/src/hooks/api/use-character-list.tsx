import {
  CHARACTER_LIST_CACHE_FRESH_TTL_MS,
  CHARACTER_LIST_CACHE_STALE_TTL_MS,
  fetchCharacterList,
} from "@/api";
import { Game } from "@/lib/game";
import { getLanguageVersion } from "@/utils/game/get-language-version";
import { useQuery } from "@tanstack/react-query";

const getCharacterListQueryKey = (
  accountId: number,
  world: string | undefined,
  languageVersion: string,
) => ["characters-v2", accountId, world, languageVersion] as const;

export const useCharacterList = () => {
  const accountId = Game.hero.account;
  const world = Game.getWorldName();
  const languageVersion = getLanguageVersion(window.location.href);

  const query = useQuery({
    queryKey: getCharacterListQueryKey(accountId, world, languageVersion),
    queryFn: () =>
      fetchCharacterList({
        accountId,
        world,
        languageVersion,
      }),
    gcTime: CHARACTER_LIST_CACHE_STALE_TTL_MS,
    retry: false,
    staleTime: CHARACTER_LIST_CACHE_FRESH_TTL_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return query;
};
