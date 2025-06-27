import { useApiClient } from "@/hooks/api/use-api-client";
import { LanguageVersion, useGlobalStore } from "@/store/global.store";
import { useQuery } from "@tanstack/react-query";

const MARGONEM_CHARTACTER_LIST_URL =
  "https://public-api.margonem.pl/account/charlist";
const MARGONEM_CHARACTER_LIST_EN_URL =
  "https://public-api.margonem.com/account/charlist";

export type MargonemCharacter = {
  clan?: number;
  clan_rank?: number;
  gender?: "m" | "f";
  icon: string;
  id: number;
  last?: number;
  lvl: number;
  nick: string;
  prof: string;
  world: string;
};

export const useCharacterList = () => {
  const { world, languageVersion } = useGlobalStore((state) => state.gameState);
  const { client } = useApiClient();
  const hs3 = window.getCookie?.("hs3");
  const url =
    languageVersion === LanguageVersion.PL
      ? MARGONEM_CHARTACTER_LIST_URL
      : MARGONEM_CHARACTER_LIST_EN_URL;

  const query = useQuery({
    queryKey: ["characters", world],
    queryFn: async () =>
      client.get<MargonemCharacter[]>(`${url}?hs3=${hs3}`, {
        withCredentials: true,
      }),
    enabled: !!hs3 && !!languageVersion,
    select: (response) =>
      response.data
        .filter((char) => char.world === world)
        .sort((a, b) => {
          return b.lvl - a.lvl;
        }),
  });

  return query;
};
