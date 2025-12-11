import { useQuery } from "@tanstack/react-query";
import { stringify } from "qs";
import { useApiClient } from "@/hooks/api/use-api-client";
import type { Loot } from "@/hooks/api/loots/use-loots";

const MATCHING_LOOTS_TIME_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export interface UseMatchingLootsParams {
  guildId: string;
  world: string;
  killedAt: string;
  npcName: string;
  enabled?: boolean;
}

export const useMatchingLoots = ({
  guildId,
  world,
  killedAt,
  npcName,
  enabled = true,
}: UseMatchingLootsParams) => {
  const { client } = useApiClient();

  const isValidParams = !!guildId && !!world && !!killedAt && !!npcName;

  const { createdAtMin, createdAtMax, queryString } = (() => {
    if (!isValidParams) {
      return { createdAtMin: "", createdAtMax: "", queryString: "" };
    }

    const killDate = new Date(killedAt);
    const min = new Date(
      killDate.getTime() - MATCHING_LOOTS_TIME_WINDOW_MS,
    ).toISOString();
    const max = new Date(
      killDate.getTime() + MATCHING_LOOTS_TIME_WINDOW_MS,
    ).toISOString();

    const queryParams = {
      world,
      npcs: [npcName],
      createdAtMin: min,
      createdAtMax: max,
      limit: 50,
    };

    const qs = stringify(queryParams, {
      arrayFormat: "comma",
      allowEmptyArrays: false,
      filter: (_, value) => {
        if (value === "" || value === undefined || value === null) {
          return;
        }
        return value;
      },
    });

    return { createdAtMin: min, createdAtMax: max, queryString: qs };
  })();

  return useQuery({
    queryKey: ["matching-loots", guildId, createdAtMin, createdAtMax, npcName],
    queryFn: async () => {
      const response = await client.get<Loot[]>(
        `/guilds/${guildId}/loots?${queryString}`,
      );
      return response.data;
    },
    enabled: enabled && isValidParams,
  });
};
