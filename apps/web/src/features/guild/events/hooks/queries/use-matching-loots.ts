import { useQuery } from "@tanstack/react-query";
import { lootsControllerFetchLootsByGuildId } from "@/lib/api/generated/main/loots/loots";
import type { LootsControllerFetchLootsByGuildIdParams } from "@/lib/api/generated/main/model";
import type { Loot } from "@/lib/loots/loot-types";
import { queryKeys } from "@/lib/query-keys";

const MATCHING_LOOTS_TIME_WINDOW_MS = 5 * 60 * 1000;

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
  const isValidParams = !!guildId && !!world && !!killedAt && !!npcName;

  const { createdAtMin, createdAtMax } = (() => {
    if (!isValidParams) {
      return { createdAtMin: "", createdAtMax: "" };
    }

    const killDate = new Date(killedAt);
    const min = new Date(
      killDate.getTime() - MATCHING_LOOTS_TIME_WINDOW_MS,
    ).toISOString();
    const max = new Date(
      killDate.getTime() + MATCHING_LOOTS_TIME_WINDOW_MS,
    ).toISOString();

    return { createdAtMin: min, createdAtMax: max };
  })();

  const params = {
    limit: 50,
    npcs: [npcName],
    world,
    createdAtMin,
    createdAtMax,
  } satisfies LootsControllerFetchLootsByGuildIdParams;

  return useQuery({
    queryKey: queryKeys.events.matchingLoots(
      guildId,
      createdAtMin,
      createdAtMax,
      npcName,
    ),
    queryFn: () =>
      lootsControllerFetchLootsByGuildId({ guildId }, params) as Promise<
        Loot[]
      >,
    enabled: enabled && isValidParams,
  });
};
