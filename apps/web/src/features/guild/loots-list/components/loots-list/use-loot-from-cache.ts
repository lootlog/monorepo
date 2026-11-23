import { useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { Loot } from "@/lib/loots/loot-types";
import { findCachedLoot } from "./loot-list-cache";

export const useLootFromCache = (lootId: number | null): Loot | null => {
  const queryClient = useQueryClient();
  const guildId = useGuildId();

  const readCachedLoot = () =>
    lootId && guildId
      ? (findCachedLoot(queryClient, guildId, lootId) ?? null)
      : null;

  return useSyncExternalStore(
    (onChange) => queryClient.getQueryCache().subscribe(onChange),
    readCachedLoot,
    readCachedLoot,
  );
};
