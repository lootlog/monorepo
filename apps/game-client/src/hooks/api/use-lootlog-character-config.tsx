import { useQuery } from "@tanstack/react-query";
import {
  fetchLootlogCharactersConfig,
  type LootlogCharacterConfigResponse,
} from "@/api";
import { Game } from "@/lib/game";
export type { LootlogCharacterConfigResponse } from "@/api";

export const useLootlogCharactersConfig = () => {
  const accountId = String(Game.hero.account);

  const query = useQuery({
    queryKey: ["lootlog-characters-config", accountId],
    queryFn: () => fetchLootlogCharactersConfig(accountId),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  return query;
};
