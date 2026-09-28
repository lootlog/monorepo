import { queryClient } from "@/lib/query-client";
import {
  getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey,
  type UserLootlogConfigAccountResponseDtoOutput,
} from "@lootlog/client/main";

/**
 * Returns the character's catching whitelist from the loaded account
 * configuration. A loaded configuration without this character matches the
 * server's empty whitelist. A pending or failed load returns `undefined` and
 * leaves the check to the server.
 */
export const getLoadedCatchingGuildIds = (
  accountId: string,
  characterId: string,
): string[] | undefined => {
  const configQuery =
    queryClient.getQueryState<UserLootlogConfigAccountResponseDtoOutput>(
      getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey({
        accountId,
      }),
    );

  return configQuery?.status === "success"
    ? (configQuery.data?.[characterId]?.catchingGuildIds ?? [])
    : undefined;
};
