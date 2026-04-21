import { Game } from "@/lib/game";
import {
  getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey,
  useUserLootlogConfigControllerGetUserLootlogConfigByAccountId,
} from "@/lib/api/generated/main/user-lootlog-config/user-lootlog-config";
import type { UserLootlogConfigAccountResponseDtoOutput } from "@/lib/api/generated/main/model";

export type LootlogCharacterConfigResponse =
  UserLootlogConfigAccountResponseDtoOutput;

export const useLootlogCharactersConfig = () => {
  const accountId = String(Game.hero.account);

  return useUserLootlogConfigControllerGetUserLootlogConfigByAccountId(
    { accountId },
    {
      query: {
        queryKey:
          getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey(
            { accountId },
          ),
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        staleTime: 0,
      },
    },
  );
};
