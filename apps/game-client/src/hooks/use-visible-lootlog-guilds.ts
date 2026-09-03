import { useUserPreferences } from "@/hooks/api/use-user-preferences";
import { getVisibleLootlogGuilds } from "@/lib/selected-lootlog-guild";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  useUsersControllerGetCurrentUserAccessibleGuilds,
} from "@lootlog/client/main";

export const useVisibleLootlogGuilds = () => {
  const guildsQuery = useUsersControllerGetCurrentUserAccessibleGuilds({
    query: {
      queryKey: getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
      refetchOnMount: false,
      staleTime: 1000 * 60 * 5,
    },
  });
  const preferencesQuery = useUserPreferences();
  const visibleGuilds = getVisibleLootlogGuilds(
    guildsQuery.data ?? [],
    preferencesQuery.data?.guildsOrder,
    preferencesQuery.data?.hiddenGuildIds,
  );

  return {
    areVisibleGuildsResolved:
      guildsQuery.data !== undefined && preferencesQuery.data !== undefined,
    guildsQuery,
    preferencesQuery,
    visibleGuilds,
  };
};
