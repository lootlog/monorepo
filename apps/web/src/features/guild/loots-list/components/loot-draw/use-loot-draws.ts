import { useQueryClient } from "@tanstack/react-query";
import {
  getLootsControllerGetDrawsQueryKey,
  invalidateLootsControllerGetDraws,
  useLootsControllerCreateDraw,
  useLootsControllerGetDraws,
  useLootsControllerVoidDraw,
  type LootDrawResponseDto,
} from "@lootlog/client/main";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { patchLoot } from "@/features/guild/loots-list/components/loots-list/loot-list-cache";
import type { Loot } from "@/lib/loots/loot-types";

const standingDrawsOf = (
  draws: readonly LootDrawResponseDto[],
): Loot["standingDraws"] =>
  draws.flatMap((draw) => {
    const winner = draw.entrants[draw.winnerIndex];

    return draw.voided === null && winner
      ? [
          {
            drawId: draw.id,
            itemHid: draw.itemHid,
            winner: { name: winner.name, prof: winner.prof, lvl: winner.lvl },
          },
        ]
      : [];
  });

export const useLootDraws = (lootId: number) => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();

  const refresh = async () => {
    if (!guildId) return;

    await invalidateLootsControllerGetDraws(queryClient, { guildId, lootId });

    const draws = queryClient.getQueryData<LootDrawResponseDto[]>(
      getLootsControllerGetDrawsQueryKey({ guildId, lootId }),
    );

    if (draws) {
      patchLoot(queryClient, guildId, lootId, {
        standingDraws: standingDrawsOf(draws),
      });
    }
  };

  const drawsQuery = useLootsControllerGetDraws(
    { guildId: guildId ?? "", lootId },
    { query: { enabled: !!guildId && !!lootId } },
  );

  const createDraw = useLootsControllerCreateDraw({
    mutation: { onSettled: refresh },
  });

  const voidDraw = useLootsControllerVoidDraw({
    mutation: { onSettled: refresh },
  });

  return { guildId, drawsQuery, createDraw, voidDraw };
};
