import {
  createAccessPolicy,
  type AccessPolicy,
} from "@lootlog/domain/access-policy";
import {
  getGuildsControllerGetGuildPermissionsQueryKey,
  getGuildsControllerGetGuildPermissionsQueryOptions,
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  useUsersControllerGetCurrentUserAccessibleGuilds,
} from "@lootlog/client/main";
import { useQueries } from "@tanstack/react-query";
import { getGuildIds, getGuildNamesById } from "@/lib/api/generated-helpers";

const STALE_TIME_MS = 5 * 60 * 1000;

export type TimerAccess = {
  /** Every organization the user can see, for "apply everywhere" actions. */
  guildIds: string[];
  guildNamesById: Record<string, string>;
  /** Access policy per requested organization; undefined until its permissions load. */
  policiesByGuildId: Record<string, AccessPolicy | undefined>;
  /** True while any requested organization's permissions are still loading. */
  isPending: boolean;
};

/**
 * Loads the accessible organizations and the permissions of the organizations
 * the visible timers belong to. Call it once per surface, never per tile, so
 * a list of N timers keeps a single observer per permissions query.
 */
export const useTimerAccessPolicies = (
  requestedGuildIds: readonly string[],
): TimerAccess => {
  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds({
    query: {
      queryKey: getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
      refetchOnMount: false,
      staleTime: STALE_TIME_MS,
    },
  });

  const uniqueGuildIds = [...new Set(requestedGuildIds)];

  const permissionQueries = useQueries({
    queries: uniqueGuildIds.map((guildId) =>
      getGuildsControllerGetGuildPermissionsQueryOptions(
        { guildId },
        {
          query: {
            queryKey: getGuildsControllerGetGuildPermissionsQueryKey({
              guildId,
            }),
            refetchOnMount: false,
            staleTime: STALE_TIME_MS,
          },
        },
      ),
    ),
  });

  const policiesByGuildId = Object.fromEntries(
    uniqueGuildIds.map((guildId, index) => {
      const capabilities = permissionQueries[index]?.data;

      return [
        guildId,
        capabilities ? createAccessPolicy({ capabilities }) : undefined,
      ];
    }),
  );

  return {
    guildIds: getGuildIds(guilds),
    guildNamesById: getGuildNamesById(guilds),
    policiesByGuildId,
    isPending: permissionQueries.some((query) => query.isPending),
  };
};
