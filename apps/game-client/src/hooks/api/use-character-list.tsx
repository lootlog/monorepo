import { useApiClient } from "@/hooks/api/use-api-client";
import { useQuery } from "@tanstack/react-query";

const MARGONEM_CHARTACTER_LIST_URL =
  "https://public-api.margonem.pl/account/charlist";

export type MargonemCharacter = {
  clan: number;
  clan_rank: number;
  gender: "m" | "f";
  icon: string;
  id: number;
  last: number;
  lvl: number;
  nick: string;
  prof: string;
  world: string;
};

export const useCharacterList = () => {
  const { client } = useApiClient();
  const hs3 = window.getCookie("hs3");

  const query = useQuery({
    queryKey: ["characters"],
    queryFn: async () =>
      client.get<MargonemCharacter[]>(
        `${MARGONEM_CHARTACTER_LIST_URL}?hs3=${hs3}`,
        {
          withCredentials: true,
        }
      ),
    select: (response) =>
      response.data.filter((char) => char.world === "arkantes"),
  });

  return query;
};
