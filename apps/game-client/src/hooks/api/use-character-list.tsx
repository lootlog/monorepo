import { fetchCharacterList } from "@/api";
import { Game } from "@/lib/game";
import { getLanguageVersion } from "@/utils/game/get-language-version";
import { useQuery } from "@tanstack/react-query";

const getCharacterListQueryKey = (
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

  return query;
};
