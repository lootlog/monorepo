import { useQueryClient } from "@tanstack/react-query";
import {
  invalidateLootsControllerGetDraws,
  useLootsControllerCreateDraw,
  useLootsControllerGetDraws,
  useLootsControllerVoidDraw,
} from "@lootlog/client/main";
import { useGuildId } from "@/hooks/context/use-guild-id";

/** A loot's draws, newest first, and the mutations that add or void one. */
export const useLootDraws = (lootId: number) => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();

  const refresh = () =>
    guildId
      ? invalidateLootsControllerGetDraws(queryClient, { guildId, lootId })
      : Promise.resolve(queryClient);

  const drawsQuery = useLootsControllerGetDraws(
    { guildId: guildId ?? "", lootId },
    { query: { enabled: !!guildId && !!lootId } },
  );

  // A conflict means another manager drew first: showing theirs is the answer.
  const createDraw = useLootsControllerCreateDraw({
    mutation: { onSettled: refresh },
  });

  const voidDraw = useLootsControllerVoidDraw({
    mutation: { onSettled: refresh },
  });

  return { guildId, drawsQuery, createDraw, voidDraw };
};
