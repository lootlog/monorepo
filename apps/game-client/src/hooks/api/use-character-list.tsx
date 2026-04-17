import { fetchCharacterList } from "@/api";
import { Game } from "@/lib/game";
import { getLanguageVersion } from "@/utils/game/get-language-version";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export type { MargonemCharacter } from "@/api";
const CHARACTER_LIST_QUERY_LOG_PREFIX = "[CharacterListQuery]";

export const getCharacterListQueryKey = (
  accountId: number,
  world: string | undefined,
) => ["characters-v2", accountId, world] as const;

export const useCharacterList = () => {
  const accountId = Game.hero.account;
  const world = Game.getWorldName();
  const languageVersion = getLanguageVersion(window.location.href);

  const query = useQuery({
    queryKey: getCharacterListQueryKey(accountId, world),
    queryFn: () =>
      fetchCharacterList({
        accountId,
        world,
        languageVersion,
      }),
    staleTime: 0,
  });

  useEffect(() => {
    console.log(`${CHARACTER_LIST_QUERY_LOG_PREFIX} Query context`, {
      accountId,
      world,
      languageVersion,
      queryKey: getCharacterListQueryKey(accountId, world),
    });
  }, [accountId, languageVersion, world]);

  useEffect(() => {
    console.log(`${CHARACTER_LIST_QUERY_LOG_PREFIX} Query state`, {
      accountId,
      world,
      isPending: query.isPending,
      isFetching: query.isFetching,
      isError: query.isError,
      dataLength: query.data?.length ?? null,
      errorMessage: query.error instanceof Error ? query.error.message : null,
    });
  }, [
    accountId,
    query.data,
    query.error,
    query.isError,
    query.isFetching,
    query.isPending,
    world,
  ]);

  return query;
};
