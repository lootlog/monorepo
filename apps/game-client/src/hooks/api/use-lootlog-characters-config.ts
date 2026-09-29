import {
  getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey,
  useUserLootlogConfigControllerGetUserLootlogConfigByAccountId,
} from "@lootlog/client/main";
import { useGameStore } from "@/store/game.store";

/**
 * The catching scope of every character on the current game account, keyed
 * by character id. Toggles write the cache optimistically, so the one
 * long-lived reading here stays current without refetching.
 */
export const useLootlogCharactersConfig = ({ enabled = true } = {}) => {
  const accountId = useGameStore((state) => state.game?.hero.accountId ?? "");

  return useUserLootlogConfigControllerGetUserLootlogConfigByAccountId(
    { accountId },
    {
      query: {
        queryKey:
          getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey(
            { accountId },
          ),
        enabled: enabled && accountId !== "",
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        staleTime: 60_000,
      },
    },
  );
};
