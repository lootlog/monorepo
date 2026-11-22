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

/** The standing result of every drawn item, as the loot list shows them. */
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

/** A loot's draws, newest first, and the mutations that add or void one. */
export const useLootDraws = (lootId: number) => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();

  // Whatever happened, the refreshed history is the truth: the loot list
  // takes its standing results from it, a rival's draw after a conflict too.
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

  // A conflict means another member drew first: showing theirs is the answer.
  const createDraw = useLootsControllerCreateDraw({
    mutation: { onSettled: refresh },
  });

  const voidDraw = useLootsControllerVoidDraw({
    mutation: { onSettled: refresh },
  });

  return { guildId, drawsQuery, createDraw, voidDraw };
};
