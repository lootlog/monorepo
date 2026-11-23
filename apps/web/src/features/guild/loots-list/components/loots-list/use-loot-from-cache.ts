import { useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { Loot } from "@/lib/loots/loot-types";
import { findCachedLoot, subscribeToLootLists } from "./loot-list-cache";

const ignoreChanges = () => () => {};

export const useLootFromCache = (lootId: number | null): Loot | null => {
  const queryClient = useQueryClient();
  const guildId = useGuildId();

  const readCachedLoot = () =>
    lootId && guildId
      ? (findCachedLoot(queryClient, guildId, lootId) ?? null)
      : null;

  return useSyncExternalStore(
    lootId && guildId
      ? (onChange) => subscribeToLootLists(queryClient, guildId, onChange)
      : ignoreChanges,
    readCachedLoot,
    readCachedLoot,
  );
};
