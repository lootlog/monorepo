import { useApiClient } from "@/hooks/api/use-api-client";
import { Game } from "@/lib/game";
import { LanguageVersion } from "@/store/global.store";
import { getLanguageVersion } from "@/utils/game/get-language-version";
import { useQuery } from "@tanstack/react-query";
import { get } from "lodash";

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
  const { client } = useApiClient();

  const accountId = Game.hero.account;
  const world = Game.getWorldName();
  const languageVersion = getLanguageVersion(window.location.href);

  const query = useQuery({
    queryKey: ["characters", world],
    queryFn: async () => {
      const margonemEntry = window.localStorage?.getItem("Margonem");
      const parsed = margonemEntry ? JSON.parse(margonemEntry) : null;

      const charlist = get(parsed, "charlist", null) as Record<
        string,
        MargonemCharacter[]
      > | null;

      const cached = accountId ? (charlist?.[accountId] ?? null) : null;

      if (cached) {
        return { data: cached };
      }

      const hs3 = window.getCookie?.("hs3");
      const url =
        languageVersion === LanguageVersion.PL
          ? MARGONEM_CHARTACTER_LIST_URL
          : MARGONEM_CHARACTER_LIST_EN_URL;

      if (!hs3 || !url) {
        throw new Error("Missing required authentication cookie or URL");
      }

      const apiResponse = await client.get<MargonemCharacter[]>(
        `${url}?hs3=${hs3}`,
        {
          withCredentials: true,
        },
      );

      const isEmptyResponse =
        !apiResponse.data || apiResponse.data.length === 0;

      if (isEmptyResponse) {
        throw new Error("Empty character list received from API");
      }

      return apiResponse;
    },
    select: (response) =>
      response.data
        .filter((char: MargonemCharacter) => char.world === world)
        .sort((a: MargonemCharacter, b: MargonemCharacter) => {
          return b.lvl - a.lvl;
        }),
    staleTime: 0,
  });

  return query;
};
