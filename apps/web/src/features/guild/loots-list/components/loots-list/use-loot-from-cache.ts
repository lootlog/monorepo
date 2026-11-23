import { useQueryClient } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { Loot } from "@/lib/loots/loot-types";
import { findCachedLoot } from "./loot-list-cache";

export const useLootFromCache = (lootId: number | null): Loot | null => {
  const queryClient = useQueryClient();
  const guildId = useGuildId();

  if (!lootId || !guildId) return null;

  return findCachedLoot(queryClient, guildId, lootId) ?? null;
};
