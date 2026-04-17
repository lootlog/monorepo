import { fetchCharacterList } from "@/api";
import { Game } from "@/lib/game";
import { LanguageVersion } from "@/store/global.store";
import { getLanguageVersion } from "@/utils/game/get-language-version";
import { useQuery } from "@tanstack/react-query";

export type { MargonemCharacter } from "@/api";

export const useCharacterList = () => {
  const accountId = Game.hero.account;
  const world = Game.getWorldName();
  const languageVersion = getLanguageVersion(window.location.href);

  const query = useQuery({
    queryKey: ["characters", world],
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
